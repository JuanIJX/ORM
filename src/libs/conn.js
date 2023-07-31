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
	 * Obtiene una lista de objetos en base a ciertas restricciones
	 * 
	 * @param {string} table Nombre de la tabla
	 * @param {array|null} selects Lista de columnas o *
	 * @param {Where|null} where Objeto con las restricciones
	 * @param {array} orders Lista de columnas para ordenar
	 * @param {boolean} order True para ascendente o false para descendente
	 * @param {number|null} limit Cantidad de datos que se van a entregar
	 * @param {number} offset Índice de comienzo para empezar a listar
	 * @returns Array de objetos
	 */
	static async getElements(table, selects=null, where=null, orders=[], order=true, limit=null, offset=0) { return []; }
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
	 * @returns 
	 */
	static async updateElementById(table, data, pkName, id) { return {}; }
	/**
	 * ABSTRACT (falta estandarizar la salida)
	 * Elimina un elemento por su ID
	 * [table, id key, id value]
	 * 
	 * @param table Nombre de la tabla
	 * @param pkName Nombre de la ID
	 * @param id Valor de la ID
	 */
	static async deleteElementById(table, pkName, id) { return {}; }
	/**
	 * ABSTRACT (falta estandarizar la salida)
	 * Elimina un conjunto de elementos
	 * 
	 * @param {string} table Nombre de la tabla
	 * @param {string} column Nombre de la columna de filtrado
	 * @param {number|null} limit Cantidad de datos que se van a eliminar
	 * @param {number} offset Índice de comienzo para empezar a eliminar
	 * @param {Where|null} where Objeto con las restricciones
	 * @returns 
	 */
	static async deleteRange(table, column=null, limit=null, offset=0, where=null) { return {}; }
	/**
	 * ABSTRACT (falta estandarizar la salida)
	 * Devuelve el total de elementos
	 * 
	 * @param {string} table Nombre de la tabla
	 * @param {Where|null} where Objeto con las restricciones
	 * @returns Numero con el valor del total
	 */
	static async count(table, where=null) { return 0; }
	/**
	 * ABSTRACT
	 * Devuelve el valor máximo de una columna
	 * 
	 * @param {string} table Nombre de la tabla
	 * @param {Where|null} where Objeto con las restricciones
	 * @returns Numero con el valor máximo
	 */
	static async max(table, column, where=null) { return 0; }
	/**
	 * ABSTRACT
	 * Devuelve el valor mínimo de una columna
	 * 
	 * @param {string} table Nombre de la tabla
	 * @param {Where|null} where Objeto con las restricciones
	 * @returns Numero con el valor mínimo
	 */
	static async min(table, column, where=null) { return 0; }
	/**
	 * ABSTRACT
	 * Devuelve la suma de una columna
	 * 
	 * @param {string} table Nombre de la tabla
	 * @param {Where|null} where Objeto con las restricciones
	 * @returns Numero con el valor de la suma
	 */
	static async sum(table, column, where=null) { return 0; }
	/**
	 * ABSTRACT
	 * Devuelve la media de una columna
	 * 
	 * @param {string} table Nombre de la tabla
	 * @param {Where|null} where Objeto con las restricciones
	 * @returns Numero con el valor de la media
	 */
	static async avg(table, column, where=null) { return 0; }




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
	async getElements(selects=null, where=null, orders=[], order=true, limit=null, offset=0) { return this.constructor.getElements(this.table, selects, where, orders, order, limit, offset); }
	async getElementById(id) { return this.constructor.getElementById(this.table, this.pkName, id); }
	async addElement(data) { return this.constructor.addElement(this.table, data); }
	async updateElementById(data, id) { return this.constructor.updateElementById(this.table, data, this.pkName, id); }
	async deleteElementById(id) { return this.constructor.deleteElementById(this.table, this.pkName, id); }
	async deleteRange(limit=null, offset=0, where=null) { return this.constructor.deleteRange(this.table, this.schemaConfig.pkName, limit, offset, where); }
	async count(where=null) { return this.constructor.count(this.table, where); }
	async max(column, where=null) { return this.constructor.max(this.table, column, where); }
	async min(column, where=null) { return this.constructor.min(this.table, column, where); }
	async sum(column, where=null) { return this.constructor.sum(this.table, column, where); }
	async avg(column, where=null) { return this.constructor.avg(this.table, column, where); }





	// Funciones abstractas del objeto

	/**
	 * ABSTRACT
	 * Crea una tabla
	 * 
	 */
	async createTable() {};
}