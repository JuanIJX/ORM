import Mysql from "mysql2"

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
			
			waitForConnections: true,
			connectionLimit: 10,
			queueLimit: 0,
			enableKeepAlive: true,
			keepAliveInitialDelay: 10000,
		}).promise();
	}

	async checkConn() {
		return await this.idbd.getConnection().then(() => {
			this._connected = true;
			return null;
		}).catch(err => {
			this._connected = false;
			return err;
		});
	}

	closed() {
		return this.idbd.pool._closed;
	}

	connected() {
		return !this.closed() && this._connected;
	}

	async close() {
		this._connected = true; // Lo pongo antes por como está construído .end()
		await this.idbd.end();
	}

	async query(command, params=[]) {
		this.lastQuery = command;
		return await this.idbd.query(this.lastQuery, params).catch(error => {
			console.log("ERROR EXTRAÑO EN POOL query")
			console.log(error);
			return null;
		});
	}

	async execute(command, params=[]) {
		this.lastQuery = command;
		return await this.idbd.execute(this.lastQuery, params).then(r => r[0]).catch(error => {
			console.log("ERROR EXTRAÑO EN POOL execute")
			console.log(error);
			return null;
		});
	}

	async rows(cad, params=[]) {
		return await this.query(cad, params).then(r => r ? r[0] : null);
	}

	async row(cad, params=[]) {
		return await this.rows(cad, params).then(r => r ? r[0] : null);
	}
}