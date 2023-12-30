import { validateEntity, validateInitConfig } from "../utils/validations.js"
import { newError } from "./error.js";
import { Schema } from "./schema.js";

export class ORM {
	static instance = null;
	static {
		if(this.instance == null)
			this.instance = new this();
	}

	static async init(config) {
		validateInitConfig(config);
		const { conn, ...dbConfig } = config.db;
		await conn.connect(dbConfig);
		this.instance.debug(`Conectado a la base de datos`);
		this.instance._conn = conn;
		await this.instance._load();
		this.instance._initialized = true;
		return this;
	}

	static addEntities(list) {
		list.forEach(e => this.instance.addEntity(e));
		return this;
	}

	static onDebug(func) {
		if(typeof func != "function")
			throw new Error(`Se esperaba una función`);
		this.instance._funcDebug = func;
	};

	static async close() {
		await this.instance?._conn?.close();
	}


	constructor() {
		this._models = new Set();
		this._modelsTemp = new Set();
		this._conn = null;
		this._initialized = false;
		this._funcDebug = msg => {};
	}

	addEntity(entity) {
		if(this._initialized)
			throw newError(`No se pueden añadir entidades despues de inicializar`);
		if(this._modelsTemp.has(entity))
			throw newError(`Entity ${entity.name} repetido`);
		if(entity.prototype instanceof Schema == false) // Schema.isPrototypeOf(entity)
			throw newError(`Entity ${entity.name} debe extender Schema`);
		validateEntity(entity);

		this._modelsTemp.add(entity);
		this.debug(`Añadido el model '${entity.name}'`);
		return this;
	}

	async close() {
		await this._conn?.close();
	}

	debug(msg) { this._funcDebug(msg); }

	async _load() {
		let antiBucleInfinito = this._modelsTemp.size;
		while(this._modelsTemp.size > 0 && antiBucleInfinito > 0) {
			for (const model of this._modelsTemp) {
				if(model.config.fg.filter(fg => !this._models.has(fg.model)).length == 0) {
					this._models.add(model);
					this._modelsTemp.delete(model);
					this._conn.schemas[this._conn.pref + model.config.table] = model.config;
					model.connector = new this._conn(model);
					await model._load();
					this.debug(`Model '${model.name}' cargado`);
				}
			}
			antiBucleInfinito--;
		}
		if(this._modelsTemp.size > 0)
			throw newError(`No se pudieron cargar los models: [ ${[...this._modelsTemp].map(m => m.name).join(", ")} ]`);
	}
}