import { validateEntity, validateInitConfig } from "../utils/validations.js"
import { newError } from "./error.js";
import { Schema } from "./schema.js";

export class ORM {
	static _models = new Set();
	static _modelsTemp = new Set();
	static _conn = null;
	static _initialized = false;

	static async init(config) {
		validateInitConfig(config);
		const { conn, ...dbConfig } = config.db;
		await conn.connect(dbConfig);
		this._conn = conn;
		await this._load();
		this._initialized = true;
	}

	static addEntity(entity) {
		if(this._initialized)
			throw newError(`No se pueden añadir entidades despues de inicializar`);
		if(this._modelsTemp.has(entity))
			throw newError(`Entity ${entity.name} repetido`);
		if(entity.prototype instanceof Schema == false) // Schema.isPrototypeOf(entity)
			throw newError(`Entity ${entity.name} debe extender Schema`);
		validateEntity(entity);

		this._modelsTemp.add(entity);
		return this;
	}

	static addEntities(list) {
		list.forEach(e => this.addEntity(e));
		return this;
	}

	static async close() {
		await this._conn?.close();
	}

	static async _load() {
		let antiBucleInfinito = this._modelsTemp.size;
		while(this._modelsTemp.size > 0 && antiBucleInfinito > 0) {
			for (const model of this._modelsTemp) {
				if(model.config.fg.filter(fg => !this._models.has(fg.model)).length == 0) {
					this._models.add(model);
					this._modelsTemp.delete(model);
					conn.schemas[model.config.table] = model.config;
					model.connector = new conn(model.config);
					await model._load();
				}
			}
			antiBucleInfinito--;
		}
		if(this._modelsTemp.size > 0)
			throw newError(`No se pudieron cargar los models: [ ${[...this._modelsTemp].map(m => m.name).join(", ")} ]`);
	}
}