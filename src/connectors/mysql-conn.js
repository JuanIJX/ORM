import Sqlstring from "sqlstring"
import MysqlPool from "../drivers/MySQL_pool2.js";
import { DBConnector } from "../libs/conn.js";
import { Type } from "../types/db-type.js";
import { TypePK } from "../types/pk-type.js";
import { isNullable } from "@ijx/utils";

function callSql(procedure, ...vars) {
	return `CALL ${procedure}(${vars.map(param => {
		if(typeof param == "number")
			return param;
		else if(param === null)
			return "NULL"
		return `'${param}'`;
	}).join(", ")})`;
}

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
		case "int": // falta uint
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
		default:
			return { type: -1 }
	}
}

export class MysqlConnector extends DBConnector {
	static tableExtra = "ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci";

	static TypePK = {
		[TypePK.NONE]: "",
		[TypePK.AUTO]: "AUTO_INCREMENT",
	};

	// Object => DB
	static TypeFuncNull = (type, value) => {
		if(isNullable(value))
			return null;
		if(!this.TypeFunc.hasOwnProperty(type))
			return value;
		return this.TypeFunc[type].d(value);
	}


	/**
	 * t: para create table VARCHAR
	 * d: objeto -> db
	 * o: db -> objeto
	 */
	static TypeFunc = {
		[Type.INT]: {
			t: (size=11) => `INT(${size})`,
			d: data => data,
			o: data => data,
		},
		[Type.UINT]: {
			t: (size=11) => `INT(${size}) UNSIGNED`,
			d: data => data,
			o: data => data,
		},
		[Type.FLOAT]: {
			t: () => `FLOAT`,
			d: data => data,
			o: data => data,
		},
		[Type.STRING]: {
			t: (size=32) => `VARCHAR(${size})`,
			d: data => data,
			o: data => data,
		},
		[Type.TEXT]: {
			t: () => `TEXT`,
			d: data => data,
			o: data => data,
		},
		[Type.DATE]: {
			t: () => `DATE`,
			d: data => (data instanceof Date) ? data.format(`Y-m-d`) : data,
			o: data => (data instanceof Date) ? data : new Date(data),
		},
		[Type.DATETIME]: {
			t: () => `DATETIME`,
			d: data => (data instanceof Date) ? data.format(`Y-m-d H:i:s`) : data,
			o: data => (data instanceof Date) ? data : new Date(data),
		},
		[Type.BOOLEAN]: {
			t: () => `ENUM('Y', 'N')`,
			d: data => data === true ? 'Y' : 'N',
			o: data => data === 'Y' ? true : false,
		}
	};

	static TypeAuto = value => {
		switch (typeof value) {
			case "boolean":
				return this.TypeFunc[Type.BOOLEAN].d(value);
			case "object":
				if(value instanceof Date)
					return this.TypeFunc[Type.DATETIME].d(value);
			default:
				return value;
		}
	}

	static getColumnSql = (columnName, columnData) => {
		let columnSQL = `\`${columnName}\` ${this.TypeFunc[columnData.type].t(columnData.size)}`;
		if(columnData.required)
			columnSQL += ` NOT NULL`;
		if(!isNullable(columnData.pk))
			columnSQL += ` PRIMARY KEY` + (columnData.pk == TypePK.NONE ? `` : ` ${this.TypePK[columnData.pk]}`);
		return columnSQL;
	}


	/**
	 * OVERRIDE
	 * 
	 * @param {object} config configuración con [host, port, user, pass, name, pref]
	 * @returns objeto de conexion a la BD
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
	static async close() { await this.idbd.close(); }
	static async sendCommand(query, params) { return await this.idbd.query(query, params); }
	static async getTables() { return (await this.idbd.rows(`SHOW TABLES;`)).map(e => Object.values(e)[0]); }
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
	static async procedure(name, ...vars) { return (await this.idbd.query(callSql(name, ...vars)))[0][0]; }

	// Abstract functions repository
	static async getElements(table, selects=null, where=null, orders=[], order=true, limit=null, offset=0) {
		const sql = Sqlstring.format(
			`SELECT ${selects === null ? `*` : selects.map(column => `${table}.${column}`).join(", ")}`
			+ ` FROM ${table}`
			+ ((where!=null) ? " WHERE " + where.print() : "")
			+ ((orders != null && orders.length > 0) ? " ORDER BY " + orders.join(", ") + ` ${order ? "ASC" : "DESC"}` : "")
			+ ((limit!=null) ? ` LIMIT ${offset}, ${limit}` : "")
			+ ";",
			where?.values().map(v => this.TypeAuto(v)) ?? []
		);
		this.debug(`Send SQL: '${sql}'`);
		return await this.idbd.rows(sql);
	}
	static async getElementById(table, pkName, id) {
		const sql = Sqlstring.format(
			`SELECT * FROM ?? WHERE ??=?;`,
			[table, pkName, id]
		);
		this.debug(`Send SQL: '${sql}'`);
		return await this.idbd.row(sql);
	}
	static async getElementByIdLeftJoin(table, pkName, id, fgName, tablesObj={}) {
		const selects = [table + `.*`];
		const tables = [table];
		tablesObj.forEach((value, key) => {
			selects.push(`${key}.${value} as ${key}_${value}`);
			tables.push(`LEFT JOIN ${key} ON ${table}.${pkName} = ${key}.${fgName}`);
		});
		const sql = Sqlstring.format(
			`SELECT ${selects.join(", ")} FROM ${tables.join(" ")} WHERE ?? = ?;`,
			[`${table}.${pkName}`, id]
		);
		this.debug(`Send SQL: '${sql}'`);
		return await this.idbd.row(sql);
	}
	static async addElement(table, data, checkKey=null) {
		const sql = Sqlstring.format(
			`INSERT INTO ${table} SET ${Object.keys(data).map(v =>`\`${v}\` = ?`).join(", ")}${checkKey != null ? ` ON DUPLICATE KEY UPDATE ${checkKey} = ${checkKey}` : ""};`,
			Object.values(data).map(v => this.TypeAuto(v)));
		this.debug(`Send SQL: '${sql}'`);
		return await this.idbd.execute(sql).then(result => result.insertId);
	}
	static async updateElementById(table, data, pkName, id) {
		const schema = this.schemas[table];
		const values = [];
		const campos = [];
		for (const key in data) {
			if(schema.columns.hasOwnProperty(key)) {
				campos.push(`\`${key}\` = ?`);
				values.push(this.TypeFuncNull(schema.columns[key].type, data[key]));
			}
			else {
				const modelInfo = schema.fg.find(fg => fg.model.fgName() == key);
				if(modelInfo) {
					campos.push(`\`${key}\` = ?`);
					values.push(this.TypeFuncNull(modelInfo.model.config.pkType, data[key]));
				}
			}
		}
		values.push(this.TypeFunc[this.schemas[table].columns[pkName].type].d(id));
		const sql = Sqlstring.format(
			`UPDATE ${table} SET ${campos.join(", ")} WHERE ${pkName} = ?;`,
			values
		);
		this.debug(`Send SQL: '${sql}'`);
		return await this.idbd.execute(sql).then(result => result.changedRows);
	}
	static async deleteElementById(table, pkName, id) { return (await this.idbd.execute(`DELETE FROM ${table} WHERE ${pkName} = ?;`, [id])).affectedRows; }
	static async deleteElements(table, column=null, where=null, limit=null, offset=0) {
		const sql = Sqlstring.format(
			(limit != null) ?
				`DELETE FROM ${table}` + (
					column!=null && (limit!=null || where!=null) ? [
						` WHERE ${column} IN (`,
							`SELECT * FROM (`,
								`SELECT ${column}`,
								`FROM ${table}`,
								(where!=null) ? "WHERE " + where.print() : "",
								`LIMIT ${offset}, ${limit}`,
							`) as tab`,
						`)`,
					].join("\n") : ""
				) + ";" :
				`DELETE FROM ${table}` + ((where!=null) ? ` WHERE ${where.print()}` : "") + ";",
			where?.values().map(v => this.TypeAuto(v)) ?? []
		);
		this.debug(`Send SQL: '${sql}'`);
		return await this.idbd.execute(sql).then(result => result.affectedRows);
	}
	static async count(table, where=null) {
		const sql = Sqlstring.format(
			`SELECT COUNT(*) as re FROM ${table}${(where!=null) ? " WHERE " + where.print() : ""};`,
			where?.values().map(v => this.TypeAuto(v)) ?? []
		);
		this.debug(`Send SQL: '${sql}'`);
		return parseInt(await this.idbd.row(sql).then(result => result.re));
	}
	static async max(table, column, where=null) {
		const sql = Sqlstring.format(
			`SELECT IFNULL(MAX(${column}), 0) as re FROM ${table}${(where!=null) ? " WHERE " + where.print() : ""};`,
			where?.values().map(v => this.TypeAuto(v)) ?? []
		);
		this.debug(`Send SQL: '${sql}'`);
		return parseFloat(await this.idbd.row(sql).then(result => result.re));
	}
	static async min(table, column, where=null) {
		const sql = Sqlstring.format(
			`SELECT IFNULL(MIN(${column}), 0) as re FROM ${table}${(where!=null) ? " WHERE " + where.print() : ""};`,
			where?.values().map(v => this.TypeAuto(v)) ?? []
		);
		this.debug(`Send SQL: '${sql}'`);
		return parseFloat(await this.idbd.row(sql).then(result => result.re));
	}
	static async sum(table, column, where=null) {
		const sql = Sqlstring.format(
			`SELECT IFNULL(SUM(${column}), 0) as re FROM ${table}${(where!=null) ? " WHERE " + where.print() : ""};`,
			where?.values().map(v => this.TypeAuto(v)) ?? []
		);
		this.debug(`Send SQL: '${sql}'`);
		return parseFloat(await this.idbd.row(sql).then(result => result.re));
	}
	static async avg(table, column, where=null) {
		const sql = Sqlstring.format(
			`SELECT IFNULL(AVG(${column}), 0) as re FROM ${table}${(where!=null) ? " WHERE " + where.print() : ""};`,
			where?.values().map(v => this.TypeAuto(v)) ?? []
		);
		this.debug(`Send SQL: '${sql}'`);
		return parseFloat(await this.idbd.row(sql).then(result => result.re));
	}


	// Object
	constructor(schema) {
		super(schema);
	}

	async createTable() {
		// Faltan los unique
		let sqlCad = `CREATE TABLE \`${this.table}\` (`
			+ '\n'
			+ [
				...this.schemaConfig.columns.map((value, key) => this.constructor.getColumnSql(key, value)).map(e => '\t' + e),
				...this.schemaConfig.fg.map(modelInfo => `\`${modelInfo.model.fgName()}\` ${this.constructor.TypeFunc[modelInfo.model.config.columns[modelInfo.model.connector.pkName].type].t(modelInfo.model.config.columns[modelInfo.model.connector.pkName].size)} ${modelInfo.required ? `NOT` : `DEFAULT`} NULL`).map(e => '\t' + e),
				...this.schemaConfig.unique.map(unique => { unique = (Array.isArray(unique) ? unique : [unique]); return `UNIQUE KEY \`${unique.join("_")}\` (\`${unique.join("`,`")}\`)` }).map(e => '\t' + e),
				...this.schemaConfig.fg.map(modelInfo => `CONSTRAINT \`${this.table}_ibfk_${modelInfo.model.fgName()}\` FOREIGN KEY (\`${modelInfo.model.fgName()}\`) REFERENCES \`${modelInfo.model.connector.table}\` (\`${modelInfo.model.connector.pkName}\`) ON DELETE ${modelInfo.delete ? 'CASCADE' : 'RESTRICT'} ON UPDATE ${modelInfo.update ? 'CASCADE' : 'RESTRICT'}`).map(e => '\t' + e),
			].filter(e => e!=null).join(',\n')
			+ "\n"
			+ `) ${this.constructor.tableExtra};`;
		this.debug(`Send SQL: '${sqlCad}'`);
		return await this.idbd.execute(sqlCad);
	};
}