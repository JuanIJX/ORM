import Mysql from "mysql"

export default class MysqlPool {
	constructor(host="", user="", pass="", name="", pref="", port=3306) {
		this.host = host;
		this.user = user;
		this.pass = pass;
		this.name = name;
		this.port = port;
		this.pref = pref;

		this.idbd = null;
		this._connected = false;
		this.lastError = "";
		this.lastQuery = "";
		this.lastFields = null;

		this.idbd = Mysql.createPool({
			host,
			port,
			user,
			password: pass,
			database: name,
			debug: false,
			connectTimeout  : 2000,

			acquireTimeout: 2000,
			waitForConnections: true,
			connectionLimit: 10,
			queueLimit: 0
		});
	}

	async checkConn() {
		return new Promise((resolve, reject) => {
			this.idbd.getConnection(err => {
				if(err) {
					this._connected = false;
					reject(err);
				}
				else {
					this._connected = true;
					resolve(null);
				}
			});
		});
	}

	closed() {
		return this.idbd._closed;
	}

	connected() {
		return !this.closed() && this._connected;
	}

	async close() {
		return new Promise((resolve, reject) => {
			this.idbd.end(err => {
				if(err)
					reject(err);
				else {
					this._connected = false;
					resolve();
				}
			});
		});
	}

	async query(command, params=[]) {
		this.lastQuery = command;
		return new Promise((resolve, reject) => {
			this.idbd.query(this.lastQuery, params, function (error, results, fields) {
				if (error) reject(error);
				else
					resolve([results, fields]);
			});
		});
	}

	async execute(command, params=[]) {
		return await this.query(command, params).then(r => r ? r[0] : null);
	}

	async rows(cad, params=[]) {
		return await this.query(cad, params).then(r => r ? r[0] : null);
	}

	async row(cad, params=[]) {
		return await this.rows(cad, params).then(r => r ? r[0] : null);
	}
}