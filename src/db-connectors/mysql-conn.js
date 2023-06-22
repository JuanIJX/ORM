import MysqlPool from "./MySQL_pool.js";
import { DBConnector } from "../libs/conn.js";
import { Type } from "../types/db-type.js";
import { TypePK } from "../types/pk-type.js";
import { isNullable } from "../utils/utils.js";

function dbTypeParse(data) {
	const [a, ...b] = data.split(" ");
	const pos = a.indexOf("(");
	if(pos == -1) return [[a]];

	let c = a.substring(pos+1, a.length - 1);
	return [
		[ a.substring(0, pos), ...b ],
		c[0] == "'" ? c.split(",").map(item => item.replace(/'/g, "")) : c
	];
}

function getType(type, se) {
	switch (type[0]) {
		case "int":
			return { type: Type.INT, size: parseInt(se) };
		case "float":
			return { type: Type.FLOAT };
		case "varchar":
			return { type: Type.STRING, size: parseInt(se) };
		case "text":
			return { type: Type.TEXT };
		case "date":
			return { type: Type.DATE };
		case "datetime":
			return { type: Type.DATETIME };
		case "enum":
			if(se[0] == 'Y' && se[0] == 'N')
				return { type: Type.BOOLEAN };
			else
				return { type: Type.ENUM, values: se };
		default:
			return { type: Type.INT, size: 11 };
	}
}

export class MysqlConnector extends DBConnector {
	static tableExtra = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";

	static TypePK = {
		[TypePK.NONE]: "",
		[TypePK.AUTO]: "AUTO_INCREMENT",
	};

	static TypeFunc = {
		[Type.INT]: {
			t: (size=11) => `INT(${size})`,
			d: data => data,
		},
		[Type.FLOAT]: {
			t: () => `FLOAT`,
			d: data => data,
		},
		[Type.STRING]: {
			t: (size=11) => `VARCHAR(${size})`,
			d: data => data,
		},
		[Type.TEXT]: {
			t: () => `TEXT`,
			d: data => data,
		},
		[Type.DATE]: {
			t: () => `DATE`,
			d: data => (data instanceof Date) ? data.format(`Y-m-d`) : data,
		},
		[Type.DATETIME]: {
			t: () => `DATETIME`,
			d: data => (data instanceof Date) ? data.format(`Y-m-d H:i:s`) : data,
		},
		[Type.BOOLEAN]: {
			t: () => `ENUM('Y', 'N')`,
			d: data => data === true ? 'Y' : 'N',
		},
		[Type.ENUM]: {
			t: (_, values) => `ENUM(${values.map(v => `'${v}'`).join(", ")})`,
			d: data => data,
		},
	};

	static getColumnSql = (columnName, columnData) => {
		let columnSQL = `\`${columnName}\` ${this.TypeFunc[columnData.type].t(columnData.size, columnData.values)}`;
		columnSQL += columnData.required ? ` NOT NULL` : ``;
		if(!isNullable(columnData.pk))
			columnSQL += ` PRIMARY KEY` + (columnData.pk == TypePK.NONE ? `` : ` ${this.TypePK[columnData.pk]}`);
		if(!columnData.required || columnData.default !== undefined)
			columnSQL += ` DEFAULT ` + (isNullable(columnData.default) ? `NULL` : (typeof columnData.default == "function" ? columnData.default() : `'${this.TypeFunc[columnData.type].d(columnData.default)}'`));
		return columnSQL;
	}


	/**
	 * OVERRIDE
	 * 
	 * @param {object} config 
	 * @returns idbd
	 */
	static async connect(config) {
		super.connect(config)
		const idbd = new MysqlPool(
			config.host,
			config.user,
			config.pass,
			config.name,
			config.pref,
			config.port
		);
		const err = await idbd.checkConn();
		if(err) throw err;
		this.idbd = idbd;

		// Save DB tables
		this._tables = await this.getTables();
		return idbd;
	};


	// Abstract functions
	static async tableToObject(table) {
		const obj = { table: table, columns: {}, unique: [], fg: [] };
		(await this.idbd.rows(`SHOW COLUMNS FROM ??;`, table)).forEach(column => {
			obj.columns[column.Field] = {
				...getType(...dbTypeParse(column.Type)),
				required: column.Null == "NO" ? true : false
			}
			if(column.Key == "PRI")
				obj.columns[column.Field].pk = column.Extra == "auto_increment" ? TypePK.AUTO : TypePK.NONE;
		});
		return obj;
	};
	static async getTables() { return (await this.idbd.rows(`SHOW TABLES;`)).map(e => Object.values(e)[0]); }
	static async getAllElements(table, selects, orders, order=true) { return await this.idbd.rows(`SELECT ?? FROM ?? ORDER BY ?? ${order ? "ASC": "DESC"}`, [selects, table, orders]); }
	static async getRangeElements(table, selects, orders, tam, pag, order=true) { return await this.idbd.rows(`SELECT ?? FROM ?? ORDER BY ?? ${order ? "ASC": "DESC"} LIMIT ? OFFSET ?`, [selects, table, orders, tam, pag * tam]); }
	static async getElementById(table, key, value) { return await this.idbd.row(`SELECT * FROM ?? WHERE ??=?`, [table, key, value]); }
	static async addElement(table, data) { return await this.idbd.execute(`INSERT INTO ?? SET ?`, [table, data]); }
	static async updateElementById(table, data, key, value) { return await this.idbd.execute(`UPDATE ?? SET ? WHERE ?? = ?`, [table, data, key, value]); }
	static async deleteElementById(table, key, value) { return await this.idbd.execute(`DELETE FROM ?? WHERE ?? = ?`, [table, key, value]); }


	constructor(idbd, schemaConfig) {
		super(idbd, schemaConfig);
	}

	async createTable() {
		// Faltan los unique
		let sqlCad = `CREATE TABLE \`${this.pref + this.schemaConfig.table}\` (`;
		sqlCad += this.schemaConfig.columns.map((key, value) => this.constructor.getColumnSql(key, value))
			.map(e => '\t' + e)
			.join(',\n')
		sqlCad += `) ${this.constructor.tableExtra};`;
		return await this.idbd.execute(sqlCad);
	};
}