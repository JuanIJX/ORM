import ORM, { Type } from "../libraries/ORM.js";

export default class User extends ORM {
	static {
		User.init({
			table: "sys_users",
			columns: {
				username:		{ type: Type.STRING, size: 32,	required: true },
				displayname:	{ type: Type.STRING, size: 100 },
				password:		{ type: Type.STRING, size: 128,	required: true, set: value => `PASSWORD(${value})` },
				email:			{ type: Type.STRING, size: 60,	required: true },
				phone:			{ type: Type.STRING, size: 12 },
				block:			{ type: Type.BOOLEAN },
				verify_level:	{ type: Type.ENUM,		values: [0, 1, 2] },
				creation_date:	{ type: Type.DATETIME,	defecto: () => new Date(), writable: false }
			},
			db_funcs: {
				getElementByNamePass: async (table, nameValue, passValue) => (await this._conn.sendCommand("SELECT * FROM ?? WHERE username = ? AND password = ?;", [table, nameValue, passValue]))[0]
			}
		});
	}

	static async getNamePass(name, pass) { return this._getFromRow(await this._conn.getElementByNamePass(this.table(), name, pass)); }
}