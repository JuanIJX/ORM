import { validateDbConfig } from "../utils/validations.js";

export class DBConnector {
	static idbd = null;
	static _tables = [];

	/**
	 * Conecta con la base de datos, realiza las
	 * comprobaciones necesarias e inicializa idbd
	 * 
	 * @param {object} config configuración con [host, port, user, pass, name, pref]
	 * @returns objeto de conexion a la BD
	 */
	static async connect(config) {
		validateDbConfig(config);
		return null;
	};

	/**
	 * Cierra la conexión a la base de datos
	 */
	static async close() { this.idbd.close(); }

	/**
	 * Se envía un comando SQL con sus parámetros al servidor
	 * 
	 * @param query Comando SQL
	 * @param params Parámetros del comando
	 * @returns Segun la query devolverá una respuesta diferente
	 */
	static async sendCommand(query, params) { return await this.idbd.query(query, params); }


	// Abstract functions

	/**
	 * ABSTRACT
	 * Obtiene todas las tablas de la base de datos
	 * 
	 * @returns array con todas las tablas
	 */
	static async getTables() { return []; }
	/**
	 * ABSTRACT
	 * Devuelve un objeto con los datos de una tabla determinada
	 * 
	 * @param {string} table nombre de la tabla 
	 * @returns objeto con los datos de la tabla
	 */
	static async tableToObject(table) { return {}; }


	// Abstract functions repository

	/**
	 * ABSTRACT
	 * Obtiene un array con todos los objetos
	 * [SELECT columns], table, [ORDER columns]
	 * 
	 * @param table Nombre de la tabla
	 * @param selects Array con columnas para el SELECT o *
	 * @param orders Array con columnas para el ORDER
	 * @param order (default true) Si es true se utilizara ASC en el ORDER
	 * @returns Array de objetos
	 */
	static async getAllElements(table, selects="*", orders=null, order=true) { return []; }
	/**
	 * ABSTRACT
	 * Obtiene un array con los objetos indicados mediante paginación
	 * [SELECT columns], table, [ORDER columns], limit, offset
	 * 
	 * @param table Nombre de la tabla
	 * @param selects Array con columnas para el SELECT o *
	 * @param orders Array con columnas para el ORDER
	 * @param tam Tamaño de pagina
	 * @param pag Numero de pagina
	 * @param order (default true) Si es true se utilizara ASC en el ORDER
	 * @returns Array de objetos
	 */
	static async getRangeElements(table, selects, tam, pag, orders=null, order=true) { return []; }
	/**
	 * ABSTRACT
	 * Obtiene un elemento por su ID
	 * [table, id key, id value]
	 * 
	 * @param table Nombre de la tabla
	 * @param pkName Nombre de la ID
	 * @param id Valor de la ID
	 * @returns Objeto
	 */
	static async getElementById(table, pkName, id) { return null; }
	/**
	 * ABSTRACT
	 * Añade un elemento
	 * [table, { data }]
	 * 
	 * @param table Nombre de la tabla
	 * @param data Objeto con los datos a añadir
	 * @returns Ejemplo de ResultSetHeader {
		fieldCount: 0,
		affectedRows: 1,
		insertId: 117,
		info: '',
		serverStatus: 2,
		warningStatus: 0
	}
	 */
	static async addElement(table, data) { return null; }
	/**
	 * ABSTRACT
	 * Actualiza un elemento
	 * [table, { data }, id key, id value]
	 * 
	 * @param table Nombre de la tabla
	 * @param data Nuevos datos
	 * @param pkName Nombre de la ID
	 * @param id Valor de la ID
	 * @returns Ejemplo de Mysql ResultSetHeader {
		fieldCount: 0,
		affectedRows: 1,
		insertId: 0,
		info: 'Rows matched: 1  Changed: 1  Warnings: 0',
		serverStatus: 2,
		warningStatus: 0,
		changedRows: 1
	}
	 */
	static async updateElementById(table, data, pkName, id) { return {}; }

	/**
	 * ABSTRACT
	 * Elimina un elemento por su ID
	 * [table, id key, id value]
	 * 
	 * @param table Nombre de la tabla
	 * @param pkName Nombre de la ID
	 * @param id Valor de la ID
	 */
	static async deleteElementById(table, pkName, id) { return {}; }





	// Objeto

	/**
	 * Inicializa el conector de la base de datos
	 * 
	 * @param {object} idbd Objeto con la conexión a la base de datos
	 */
	constructor(schemaConfig) {
		Object.defineProperty(this, `_schemaConfig`, { value: schemaConfig });

		this.table = this.pref + this.schemaConfig.table;
		//this.pkName = Object.entries(this.schemaConfig.columns).find(([_, value]) => typeof value.pk == "number")[0];
	}

	get idbd() { return this.constructor.idbd; }
	get pref() { return this.idbd.pref; }
	get schemaConfig() { return this._schemaConfig; }
	get tables() { return this.constructor._tables; }
	get pkName() { return this.schemaConfig.pkName; }

	debug(msg) {}

	/**
	 * Crea la tabla o edita si ya está creada y hay cambios
	 */
	async load() {
		if(this.tables.includes(this.table)) {
			//console.log(`Se debe comparar la tabla ${this.table}`);
			//console.log(`Posible edicion`);
			const dbTable = await this.constructor.tableToObject(this.table);
			//console.log(this.schemaConfig);
		}
		else
			await this.createTable().then(() => this.debug(`Tabla '${this.table}' creada`));
	}

	/**
	 * Añade una función al conector
	 * 
	 * @param name Nombre de la función
	 * @param func Función con las instrucciones
	 * @returns Devuelve this
	 */
	addCommand(name, func) { return Object.defineProperty(this, name, { value : func, enumerable: true }); }

	// Functions repository (resumido)
	async getAllElements(selects="*", orders=null, order=true) { return await this.constructor.getAllElements(this.table, selects, orders, order); }
	async getRangeElements( selects, tam, pag, orders, order=true) { return await this.constructor.getRangeElements(this.table, selects, tam, pag, orders, order=true); }
	async getElementById(id) { return await this.constructor.getElementById(this.table, this.pkName, id); }
	async addElement(data) { return await this.constructor.addElement(this.table, data); }
	async updateElementById(data, id) { return await this.constructor.updateElementById(this.table, data, this.pkName, id); }
	async deleteElementById(id) { return this.constructor.deleteElementById(this.table, this.pkName, id); }




	// Funciones abstractas del objeto

	/**
	 * ABSTRACT
	 * Crea una tabla
	 * 
	 */
	async createTable() {};
}