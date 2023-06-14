import { Collection } from "@discordjs/collection";
import SQL from "./SQL_PromisePool.js"
import { defObject, isFloat, isInteger, NewError, NewErrorFormat } from "./utils.js";

// Tipos de generacion de ID en base de datos
const Generation = {
	NONE: "none",
	AUTO: "autoincrement"
};

// Tipo de dato de la columna
const Type = {
	INT: "int",
	FLOAT: "float",
	STRING: "varchar",
	DATE: "date",
	DATETIME: "datetime",
	BOOLEAN: "enum('Y', 'N')",
	ENUM: "enum"
};

class DBConnector {
	constructor() {}

	get idbd() {}
	get pref() { return this.idbd.constructor.pref; }

	/**
	 * Se envía un comando SQL con sus parámetros al servidor
	 * 
	 * @param query Comando SQL
	 * @param params Parámetros del comando
	 * @returns Segun la query devolverá una respuesta diferente
	 */
	sendCommand = async (query, params) => this.idbd.rows(query, params);

	/**
	 * Añade una función al conector
	 * 
	 * @param name Nombre de la función
	 * @param func Función con las instrucciones
	 * @returns Devuelve this
	 */
	addCommand = (name, func) => Object.defineProperty(this, name, { value : func, enumerable: true });


	// Funciones

	/**
	 * Obtiene un array con todos los objetos
	 * [SELECT columns], table, [ORDER columns]
	 * 
	 * @param table Nombre de la tabla
	 * @param selects Array con columnas para el SELECT o *
	 * @param orders Array con columnas para el ORDER
	 * @param order (default true) Si es true se utilizara ASC en el ORDER
	 * @returns Array de objetos
	 */
	getAllElements = async (table, selects, orders, order=true) => [];

	/**
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
	getRangeElements = async (table, selects, orders, tam, pag, order=true) => [];

	/**
	 * Obtiene un elemento por su ID
	 * [table, id key, id value]
	 * 
	 * @param table Nombre de la tabla
	 * @param key Nombre de la ID
	 * @param value Valor de la ID
	 * @returns Objeto
	 */
	getElementById = async (table, key, value) => undefined;

	/**
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
	addElement = async (table, data)  => null;

	/**
	 * Actualiza un elemento
	 * [table, { data }, id key, id value]
	 * 
	 * @param table Nombre de la tabla
	 * @param data Nuevos datos
	 * @param key Nombre de la ID
	 * @param value Valor de la ID
	 * @returns Ejemplo de ResultSetHeader {
		fieldCount: 0,
		affectedRows: 1,
		insertId: 0,
		info: 'Rows matched: 1  Changed: 1  Warnings: 0',
		serverStatus: 2,
		warningStatus: 0,
		changedRows: 1
	}
	 */
	updateElementById = async (table, data, key, value) => {};

	/**
	 * Elimina un elemento por su ID
	 * [table, id key, id value]
	 * 
	 * @param table Nombre de la tabla
	 * @param key Nombre de la ID
	 * @param value Valor de la ID
	 */
	deleteElementById = async (table, key, value) => {};
}

class MysqlConnector extends DBConnector {
	get idbd() { return SQL.g; }

	getAllElements		= async (table, selects, orders, order=true)				=> await this.idbd.rows(`SELECT ?? FROM ?? ORDER BY ?? ${order ? "ASC": "DESC"}`						, [selects, table, orders]);
	getRangeElements	= async (table, selects, orders, tam, pag, order=true)		=> await this.idbd.rows(`SELECT ?? FROM ?? ORDER BY ?? ${order ? "ASC": "DESC"} LIMIT ? OFFSET ?`	, [selects, table, orders, tam, pag * tam]);
	getElementById		= async (table, key, value) 								=> (await this.idbd.rows(`SELECT * FROM ?? WHERE ??=?`												, [table, key, value]))[0];
	addElement			= async (table, data) 										=> await this.idbd.rows(`INSERT INTO ?? SET ?`														, [table, data]);
	updateElementById	= async (table, data, key, value) 							=> await this.idbd.rows(`UPDATE ?? SET ? WHERE ?? = ?`												, [table, data, key, value]);
	deleteElementById	= async (table, key, value) 								=> await this.idbd.rows(`DELETE FROM ?? WHERE ?? = ?`												, [table, key, value]);
}

const Connector = {
	MYSQL: new MysqlConnector()
};

class ManagerORM {
	static models = new Collection();

	static getSQL() {
		var sql = "";
		return this.models.reduce((ac, ClassModel, modelName) => ac + '\n' + '\n' + ClassModel.getTableSQL(), "");
	}
}

class ORM {
	// Constantes
	static Error = {
		INVALID_CONNECTOR:				["el conector debe ser una instancia de DBConnector", "invalid_connector"],
		INVALID_PK_TYPE:				["el tipo del PK debe ser INT, FLOAT, STRING, DATE o DATETIME", "invalid_pk_type"],
		WRONG_TABLE:					["nombre de la tabla no válido", "wrong_table"],
		WRONG_DESCRIPTOR_TYPE:			["columna '%s': descriptor.type erroneo", "wrong_descriptor_type"],
		WRONG_DESCRIPTOR_ENUM:			["columna '%s': descriptor.value debe ser un array con algún valor", "wrong_descriptor_enum"],
		WRONG_DESCRIPTOR_MIN_INT:		["columna '%s': descriptor.min debe ser un entero", "wrong_descriptor_min"],
		WRONG_DESCRIPTOR_MAX_INT:		["columna '%s': descriptor.max debe ser un entero", "wrong_descriptor_max"],
		WRONG_DESCRIPTOR_MIN_FLOAT:		["columna '%s': descriptor.min debe ser un float", "wrong_descriptor_min"],
		WRONG_DESCRIPTOR_MAX_FLOAT:		["columna '%s': descriptor.max debe ser un float", "wrong_descriptor_max"],
		WRONG_DESCRIPTOR_MAX_MIN:		["columna '%s': descriptor.min no debe ser mayor a descriptor.max", "wrong_descriptor"],
		WRONG_DESCRIPTOR_SIZE:			["columna '%s': descriptor.size debe ser un entero", "wrong_descriptor_size"],
		WRONG_DESCRIPTOR_WRITABLE:		["columna '%s': descriptor.writable debe ser un boolean", "wrong_descriptor_writable"],
		WRONG_DESCRIPTOR_REQUIRED:		["columna '%s': descriptor.required debe ser un boolean", "wrong_descriptor_required"],
		WRONG_DESCRIPTOR_VISIBLE:		["columna '%s': descriptor.visible debe ser un boolean", "wrong_descriptor_visible"],
		WRONG_DESCRIPTOR_ALIAS:			["columna '%s': descriptor.alias debe ser un string", "wrong_descriptor_alias"],
		WRONG_DESCRIPTOR_SET:			["columna '%s': descriptor.set debe ser un function", "wrong_descriptor_set"],
		//WRONG_DESCRIPTOR_DEFECTO_NULL:	["columna '%s': descriptor.defecto debe tener un valor", "wrong_descriptor_defecto"],
		WRONG_DESCRIPTOR_DEFECTO_VALUE: ["columna '%s': descriptor.defecto tiene un valor erróneo", "wrong_descriptor_defecto"],
		INVALID_SETDATA_INVALID_TYPE:	["el tipo de '%s' no debe ser %s", "invalid_setdata_invalid_type"],
		INVALID_SETDATA_OUTOFRANGE:		["columna '%s': debe ser %s %s", "invalid_setdata_outofrange"],
		INVALID_SETDATA_MAXLENGTH:		["tamaño de '%s' superado, max %s", "invalid_setdata_maxlength"],
		INVALID_SETDATA_INVALID_VALUE:	["columna '%s': el valor debe encontrarse en la lista [%s]", "invalid_setdata_invalid_value"],
		INVALID_SETDATA_BADSTRING:		["columna '%s': el string no se puede convertir a Date", "invalid_setdata_badstring"],
		ELEMENT_NOTFOUND:				["elemento con ID %s no encontrado", "element_notfound"],
		VALUE_REQUIRED:					["columna '%s' requerida", "value_required"],
	};

	static _DEFAULT_DESCRIPTOR = {
		type: Type.INT, // Tipo de dato5
		defecto: null, // Valor default (puede ser una funcion que retorna el valor default)
		size: 11, // Tamaño del dato
		min: null, // Valor mínimo del dato
		max: null, // Valor máximo del dato
		values: null, // Valor default o valores posibles en un enum
		writable: true, // Posibilidad de modificar
		required: false, // Si tiene valor default en BD no poner a true
		visible: true, // Visible y accesible desde la interfaz del objeto
		alias: "", // Nombre para interactuar con el objeto
		set: value => value
	};


	// Constantes
	static _conn = null;
	static _table = null;
	static _pk_name = null;
	static _pk_type = null;
	static _pk_size = null;
	static _pk_generation = null;
	static _columns = null;
	static _restrincts = {
		unique: [],
		index: []
	};


	// Funciones públicas

	/**
	 * Configura el model
	 * 
	 * @param config Objeto con las configuraciones
	 */
	static init(config) {
	//static init = function(config) {
	//static init = (config) => { // BAD SYNTAX
		this._checkTable(config.table)
		this._checkColumnsDescriptor(config.columns);

		this._conn = config.conn || Connector.MYSQL;
		if(!(this._conn instanceof DBConnector))
			throw NewError(...this.Error.INVALID_CONNECTOR);

		this._table = config.table || "DEF_table";
		this._pk_name = config.pk_name || "id";
		this._pk_type = config.pk_type || Type.INT;
		this._pk_size = config.pk_size || 11;
		this._pk_generation = config.pk_generation || Generation.AUTO;
		if(![
			Type.INT,
			Type.FLOAT,
			Type.STRING,
			Type.DATE,
			Type.DATETIME
		].includes(this._pk_type))
			throw NewError(...this.Error.INVALID_PK_TYPE);
		this._columns = config.columns || {};

		// Añadir funciones de base de datos
		if(config.hasOwnProperty("db_funcs"))
			for (const dbNameFunction in config.db_funcs)
				this._conn.addCommand(dbNameFunction, config.db_funcs[dbNameFunction])


		// Add all models
		ManagerORM.models.set(this.name, this);
	};

	/** ...
	 * Genera un comando SQL con la creación de la tabla
	 * 
	 * @returns Comando SQL
	 */
	static getTableSQL() {
		const unique = [], constraints = [];
		var cad = `CREATE TABLE IF NOT EXISTS \`${this.table()}\` (` + '\n';

		cad += '\t' + `\`${this._pk_name}\` ${this._pk_type}${[Type.STRING, Type.INT, Type.FLOAT].includes(this._pk_type) ? `(${this._pk_size})` : ""} PRIMARY KEY,` + '\n';
		for (const column in this._columns) {
			const descriptor = this._columns[column];
			var type = this._isOwnClass(descriptor.type) ? descriptor.type._pk_type : descriptor.type;

			if(this._isOwnClass(descriptor.type)) {
				type = descriptor.type._pk_type;
				constraints[column] = descriptor.type;
			}
			else
				type = descriptor.type;

			if([Type.STRING, Type.INT, Type.FLOAT].includes(type))
				type += `(${descriptor.size})`;
			else if(Type.ENUM === type)
				type += `(${descriptor.values.map(v => `'${v}'`).join(", ")})`;
			cad += '\t' + `\`${column}\` ${type} ${descriptor.required || !descriptor.writable ? "NOT NULL" : "DEFAULT NULL"},` + '\n';
		}

		for(const column in unique)
			cad += '\t' + `UNIQUE KEY \`${column}\` (\`${column}\`),` + '\n';
		var cn = 0;
		for(const column in constraints)
			cad += '\t' + `CONSTRAINT \`${this.table()}_ibfk_${++cn}\` FOREIGN KEY (\`${column}\`) REFERENCES \`${constraints[column].table()}\` (\`${constraints[column]._pk_name}\`) ON DELETE CASCADE ON UPDATE RESTRICT,` + '\n';

		return cad.substring(0, cad.length-2) + '\n' + ");";
	}

	/**
	 * Realiza una búsqueda de la ID en la base de datos y
	 * devuelve un elemento
	 * 
	 * @param id ID del elemento
	 * @returns Una instancia del elemento o NULL en caso de no encontrar
	 */
	static async get(id) { return this._getFromRow(await this._getRow(id)); }

	/**
	 * Añade un nuevo elemento a partir de la información proporcionada
	 * por data. Si el elemento ya existe se lanzará una excepción
	 * procedente de la base de datos ya que así es más eficiente que
	 * andar con dos query.
	 * 
	 * @param data Objeto con los datos
	 * @returns Una instancia del elemento añadido
	 * @throws Puede lanzar 
	 */
	static async add(data) {
		const [dataRAM, dataDB] = this._checkData(data, true, false);
		return this._getInstance(
			[Type.AUTO].includes(this._pk_generation) ?
				(await this._conn.addElement(this.table(), dataDB)).insertId :
				dataDB[this._pk_name]
		)._set(dataRAM);
	};

	/**
	 * Devuelve una coleccion de todos los elementos
	 * 
	 * @returns Objeto coleccion con los elementos
	 */
	static async getAll() { return this.getAllRange(0, 0) };

	/**
	 * Devuelve una coleccion de los elementos que estén
	 * en la pagina indicada
	 * 
	 * @param pag Numero de pagina
	 * @param tam (opcional) tamaño de pagina
	 * @returns Objeto coleccion con los elementos
	 */
	static async getAllRange(pag, tam=10) { return new Collection(); }


	// Funciones privadas

	/**
	 * Obtiene una instancia del objeto
	 * 
	 * @param id ID del objeto
	 * @returns Una instancia del objeto
	 */
	static _getInstance(id) {
		return new this(id);
	}

	/**
	 * Obtiene una instancia del elemento a partir de row
	 * 
	 * @param row Objeto obtenido de la query
	 * @returns Instancia del objeto o null en caso de no hayarlo
	 */
	static async _getFromRow(row) {
		return row === undefined ? null : this._getInstance(row[this._pk_name])._setFetch(row);
	}

	/**
	 * Comprueba si una clase pertenece a ORM
	 * 
	 * @param clase objeto de tipo clase
	 * @returns true en caso de pertenecer
	 */
	static _isOwnClass(clase) { return ORM.isPrototypeOf(clase); }

	/**
	 * (Async) Comprueba si existe un registro y lo devuelve
	 * en forma de objeto clave/valor
	 * 
	 * @param id ID del elemento
	 * @returns Devuelve un row o undefined en caso de no existir
	 */
	static _getRow(id) { return this._conn.getElementById(this.table(), this._pk_name, id); }

	/**
	 * Devuelve el nombre de la tabla con su prefijo
	 * 
	 * @returns Nombre completo de la tabla
	 */
	static table() { return this._conn.pref + this._table; };

	/**
	 * ...
	 * @returns 
	 */
	_getForeigns() {
		return Object.values(this._columns).filter(e => Object.values(Type).includes(e.type))
	}

	/**
	 * Devuelve el descriptor de una columna
	 * 
	 * @param column Nombre de la columna
	 * @returns Objeto descriptor
	 */
	static _getDescriptor(column) { return this._columns[column]; }

	/**
	 * Comprueba si los datos son aptos para introducirse en el
	 * sistema y devuelve los datos aptos para ser añadidos. Si
	 * checkRequired está a true se tendrá en cuenta si la columna
	 * es requerida o no.
	 * 
	 * @param data Objeto con los datos que se comprobarán
	 * @param checkRequired (defecto a false) Comprueba si falta algún campo en requerido
	 * @param checkWritable (defecto a true) Comprueba si existe algún campo no writable para impedir su escritura
	 * @returns Devuelve un array con dos objetos, el primero con los datos para RAM y el siguiente para la BD
	 * @throws En caso de que alguna columna no cumpla con los requisitos
	 */
	static _checkData(data, checkRequired=false, checkWritable=true) {
		const dataRAM = {}, dataDB = {};

		// Comprobación de PK
		switch(this._pk_generation) {
			case Generation.AUTO: // Se elimina el key ID de data si es autogenerado
				if(data.hasOwnProperty(this._pk_name))
					delete data[this._pk_name];
				break;
			case Generation.NONE:
			default:
				if(data.hasOwnProperty(this._pk_name))
					dataDB[this._pk_name] = data[this._pk_name];
				else
					if(checkRequired)
						throw NewErrorFormat(this.Error.VALUE_REQUIRED, this._pk_name);
				break;
		}

		for (const column in this._columns) {
			const descriptor = this._getDescriptor(column);

			if(checkWritable && !descriptor.writable) continue;

			// Si no se ha introducido
			if(!data.hasOwnProperty(column)) {
				// Si es requerido y check ON
				if(descriptor.required && checkRequired)
					throw NewErrorFormat(this.Error.VALUE_REQUIRED, column);
				
				// Si es writable
				if(descriptor.writable)
					continue;
				
				// No es writable y no tenemos valor por defecto
				if(descriptor.defecto === null)
					throw NewErrorFormat(this.Error.VALUE_REQUIRED, column); // No se yo si este throw msg es correcto
				else
					data[column] = typeof(descriptor.defecto) == "function" ? descriptor.defecto() : descriptor.defecto;
			}
			
			var vRAM = null, vDB = null;
			if(data[column] === null) {
				if(descriptor.required && checkRequired)
					throw NewErrorFormat(this.Error.VALUE_REQUIRED, column);
			}
			else {
				[vRAM, vDB] = this._checkValue(
					column,
					data[column],
					descriptor,
					checkWritable
				);
			}

			dataRAM[column] = vRAM;
			dataDB[column] = vDB;
		}
		return [dataRAM, dataDB];
	}

	/**
	 * Comprueba si un dato concreto es correcto para ser
	 * introducido al sistema y devuelve el dato en formato
	 * apto para ser almacenado en RAM y otro para BD.
	 * 
	 * @param column Qué valor se va a introducir
	 * @param value El valor del dato
	 * @param descriptor Descriptor de column
	 * @param setFunc (default true) Utiliza la funcion set del descriptor
	 * @returns Un array con dos valores: el primero para RAM
	 * y el segundo para BD
	 * @throws En caso de que un dato no sea correcto
	 */
	static _checkValue(column, value, descriptor, setFunc=true) {
		if(value === null && descriptor.required)
			throw NewErrorFormat(this.Error.INVALID_SETDATA_INVALID_TYPE, column, "NULL");
		
		if(setFunc)
			value = descriptor.set(value);
			
		var valueRAM = value, valueDB = value;
		switch(descriptor.type) {
			case Type.INT:
				if(!isInteger(value))
					throw NewErrorFormat(this.Error.INVALID_SETDATA_INVALID_TYPE, column, typeof(value));
			case Type.FLOAT:
				if(!isFloat(value))
					throw NewErrorFormat(this.Error.INVALID_SETDATA_INVALID_TYPE, column, typeof(value));
				if(descriptor.min !== null && value < descriptor.min)
					throw NewErrorFormat(this.Error.INVALID_SETDATA_OUTOFRANGE, column, ">=", descriptor.min);
				if(descriptor.max !== null && value > descriptor.max)
					throw NewErrorFormat(this.Error.INVALID_SETDATA_OUTOFRANGE, column, "<=", descriptor.max);
				break;
			case Type.STRING:
				if(typeof(value) !== "string")
					throw NewErrorFormat(this.Error.INVALID_SETDATA_INVALID_TYPE, column, typeof(value));
				if(value.length > descriptor.size)
					throw NewErrorFormat(this.Error.INVALID_SETDATA_MAXLENGTH, column, descriptor.size);
				if(value.length < descriptor.min)
					throw NewErrorFormat(this.Error.INVALID_SETDATA_OUTOFRANGE, column, ">=", descriptor.min);
				break;
			case Type.DATE:
			case Type.DATETIME:
				if(value instanceof Date) {
					valueDB = value.format("Y-m-d H:i:s");
				} else if(typeof(value) == "string") {
					// Convertir string a Date()
					valueRAM = new Date(value);

					// Checkear si el string es correcto formato de fecha, posible excepcion
					if(valueRAM.toString() == "Invalid Date")
						throw NewErrorFormat(this.Error.INVALID_SETDATA_BADSTRING, column);
				} else
					throw NewErrorFormat(this.Error.INVALID_SETDATA_INVALID_TYPE, column, typeof(value));
				break;
			case Type.BOOLEAN:
				if(value === true || value === false)
					valueDB = value ? "Y" : "N";
				else if(value === "Y" || value === "N")
					valueRAM = value === "Y" ? true : false;
				else
					throw NewErrorFormat(this.Error.INVALID_SETDATA_INVALID_TYPE, column, typeof(value));
				break;
			case Type.ENUM:
				if(!descriptor.values.includes(value))
					throw NewErrorFormat(this.Error.INVALID_SETDATA_INVALID_VALUE, column, descriptor.value.toString());
				break;
			default:
				if(
					typeof(value) !== "number" &&
					typeof(value) !== "string" &&
					!(value instanceof descriptor.type)
				)
					throw NewErrorFormat(this.Error.INVALID_SETDATA_INVALID_TYPE, column, typeof(value));

					if(value instanceof descriptor.type) {
						valueRAM = value._id;
						valueDB = valueRAM;
					}
				break;
		}

		return [valueRAM, valueDB];
	};

	/** ...
	 * Comprueba que el nombre de la tabla sea válido
	 * 
	 * @param name Nombre de la tabla
	 * @throws Si el nombre de la tabla es incorrecto
	 */
	static _checkTable (name) {
		//throw NewError(...this.Error.WRONG_TABLE);
	};

	/**
	 * Comprueba que los descriptor de las columnas sean correctos
	 * 
	 * @param columns Objeto de { column: descriptor }
	 * @throws Si hay algun error en el descriptor
	 */
	static _checkColumnsDescriptor (columns) {
		for (const column in columns) {
			const columnDescriptor = columns[column];

			// Se lanza si el descriptor.type no pertenece al conjunto de tipos, no es herencia de ORM o si ni si quiera se ha introducido
			if(!Object.values(Type).includes(columnDescriptor.type) && !this._isOwnClass(columnDescriptor.type))
				throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_TYPE, column);
			
			// Se ponen valores default para no comprobar su existencia
			defObject(columnDescriptor, this._DEFAULT_DESCRIPTOR);

			if(!isInteger(columnDescriptor.size))					throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_SIZE,		 column);
			if(typeof(columnDescriptor.writable)	!== "boolean") 	throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_WRITABLE,	 column);
			if(typeof(columnDescriptor.required)	!== "boolean") 	throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_REQUIRED,	 column);
			if(typeof(columnDescriptor.visible) 	!== "boolean") 	throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_VISIBLE,	 column);
			if(typeof(columnDescriptor.alias) 		!== "string")	throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_ALIAS,		 column);
			if(typeof(columnDescriptor.set) 		!== "function")	throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_SET,		 column);

			// Si writable es false defecto no debe estar vacio
			/*if(columnDescriptor.defecto === null && columnDescriptor.writable == false)
				throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_DEFECTO_NULL, column);*/

			// Check por cada tipo
			switch(columnDescriptor.type) {
				case Type.ENUM:
					if(!Array.isArray(columnDescriptor.values) || columnDescriptor.values.length < 1)
						throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_ENUM, column);
					break;
				case Type.INT:
					if(columnDescriptor.min !== null && !isInteger(column.min))
						throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_MIN_INT, column);
					if(columnDescriptor.max !== null && !isInteger(column.max))
						throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_MAX_INT, column);
					if(columnDescriptor.min !== null && columnDescriptor.max !== null && columnDescriptor.min > columnDescriptor.max)
						throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_MAX_MIN, column);
					break;
				case Type.FLOAT:
					if(columnDescriptor.min !== null && !isFloat(column.min))
						throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_MIN_FLOAT, column);
					if(columnDescriptor.max !== null && !isFloat(column.max))
						throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_MIN_FLOAT, column);
					if(columnDescriptor.min !== null && columnDescriptor.max !== null && columnDescriptor.min > columnDescriptor.max)
						throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_MAX_MIN, column);
					break;
			}

			if(columnDescriptor.defecto !== null) {
				try {
					this._checkValue(
						column,
						typeof(columnDescriptor.defecto) == "function" ?
							columnDescriptor.defecto() :
							columnDescriptor.defecto,
						columnDescriptor,
						false
					);
				}
				catch (error) {
					throw NewErrorFormat(this.Error.WRONG_DESCRIPTOR_DEFECTO_VALUE, column);
				}
			}
		}
	};


	// Objeto

	/**
	 * Inicializa el objeto con la ID del objeto
	 * 
	 * @param id ID del elemento
	 */
    constructor(id) {
		Object.defineProperty(this, "_id", { value : id });
		Object.defineProperty(this, this.constructor._pk_name, { value : id, enumerable: true });

		for (const column in this.constructor._columns)
			this._createObjectColumn(column);
    }

	/**
	 * Devuelve el conector que interactua con la base de datos
	 */
	get conn() { return this.constructor._conn; }
	
	/** ...
	 * Devuelve un json del elemento
	 * 
	 * @returns string con el objeto codificado
	 */
	toString() {
		return JSON.stringify(this.toObject());
	}

	/**
	 * Transforma esta instancia en un objeto simple
	 * 
	 * @returns objeto
	 */
	toObject() {
		const obj = {};
		obj[this.constructor._pk_name] = this._id;
		for (const column in this.constructor._columns)
			obj[column] = this[`_${column}`];
		return obj;
	}

	/**
	 * Comprueba si un objeto es equivalente a esta instancia
	 * 
	 * @param object objeto que se comparará
	 * @returns true en caso de ser igual
	 */
	equals(object) {
		if(!(object instanceof this.constructor))
			return false;
		return this._id === object._id;
	}


	// Actions

	/**
	 * Refresca la memoria local con datos procedentes de la BD
	 * 
	 * @returns Elemento
	 * @throws En caso de no encontrar la ID del objeto
	 */
	async fetchAll() {
		const row = await this.constructor._getRow(this._id);
		if(row === undefined)
			throw NewErrorFormat(this.constructor.Error.ELEMENT_NOTFOUND, this._id);
		return this._setFetch(row);
	}

	/** ...
	 * Edita el elemento
	 * 
	 * @param data Objeto con los datos que se editarán y comprobaran
	 * @returns Elemento
	 */
	async edit(data) {
		const [dataRAM, dataDB] = this.constructor._checkData(data, false, true);
		await this.conn.updateElementById(this.constructor.table(), dataDB, this.constructor._pk_name, this._id);
		return this._set(dataRAM);
	}

	/**
	 * Elimina el elemento
	 * 
	 */
	async delete() {
		await this.conn.deleteElementById("tabla", this.constructor._pk_name, this._id);
	}


	// Funciones privadas

	/**
	 * Rellena el elemento con los datos proporcionados por row. Previamente se
	 * realiza un checkeo de los datos.
	 * 
	 * @param row Datos para introducir
	 * @returns Elemento o null en caso de que row no sea un objeto
	 */
	_setFetch(row) {
		return typeof(row) == "object" ? this._set(this.constructor._checkData(row, true, false)[0]) : null;
	}

	/**
	 * Rellena el elemento con los datos proporcionados por data
	 * 
	 * @param data Objeto con los datos
	 * @returns Elemento
	 */
	_set(data) {
		for (const column in data) {
			if(!this.constructor._columns.hasOwnProperty(column)) continue;
			this[`_${column}`] = data[column];
		}
		return this;
	}

	/**
	 * Crea un atributo, un getter y un setter a un elemento
	 * a partir de la información proporcinada por column y su
	 * descriptor
	 * 
	 * @param column nombre de la columna
	 * @param descriptor descriptor de la columna
	 */
	_createObjectColumn(column) {
		const descriptor = this.constructor._getDescriptor(column);
		const propertyAlias = descriptor.alias === "" ? column : descriptor.alias;

		this._createObjectColumnAttribute(column);
		if(descriptor.visible)
			this._createObjectColumnGetter(column, descriptor, propertyAlias);
		if(descriptor.writable)
			this._createObjectColumnSetter(column, descriptor, propertyAlias);
	};

	/**
	 * Añade un atributo _@param column
	 * 
	 * @param column nombre de la columna
	 * @param descriptor descriptor de la columna
	 */
	_createObjectColumnAttribute(column) {
		Object.defineProperty(this, `_${column}`, { value: null, writable: true, enumerable: false });
	};

	/**
	 * Añade un getter de @param column
	 * 
	 * @param column nombre de la columna
	 * @param descriptor descriptor de la columna
	 * @param propertyAlias nombre visible del atributo
	 */
	_createObjectColumnGetter(column, descriptor, propertyAlias) {
		Object.defineProperty(this, propertyAlias.camelCase(), { get: () => this.constructor._isOwnClass(descriptor.type) ? descriptor.type.get(this[`_${column}`]) : this[`_${column}`], enumerable: true });
	};

	/**
	 * Añade una funcion setter en camelCase de @param column
	 * 
	 * @param column nombre de la columna
	 * @param descriptor descriptor de la columna
	 * @param propertyAlias nombre visible del atributo
	 */
	_createObjectColumnSetter(column, descriptor, propertyAlias) {
		Object.defineProperty(this, `set_${propertyAlias}`.camelCase(), {
			value : async function(value) {
				// Comprobaciones de value
				const [valueRam, valueDB] = this.constructor._checkValue(
					column,
					value,
					descriptor,
					true
				);
				if(this.constructor._isOwnClass(descriptor.type) && (await descriptor.type._getRow(valueDB)) === undefined)
					throw NewErrorFormat(this.constructor.Error.ELEMENT_NOTFOUND, valueDB);

				// Introducir value
				await this.conn.updateElementById(this.constructor.table(), { [column]: valueDB }, this.constructor._pk_name, this._id);
				this[`_${column}`] = valueRam;
				return this;
			},
			enumerable: true
		});
	};
}

export {
	ManagerORM,
	Generation,
	Type,
	Connector
}
export default ORM;


/*
Mejoras o cosas por hacer:
- Añadir opción de añadir datos masivos
- Cambiar sistema de Object.defineProperty a Object.prototype (teorico)
- Posible incorporacion de tabla al conector
- Completar UNIQUE
- Sistema de cachear cada .get para no sacarlo de la DB dos veces
- many to many y otras claves foraneas, lectura de otras tablas
- Analisis de todas las tablas y obtener un objeto con la informacion
  de sus claves foraneas.
*/