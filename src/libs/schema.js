'use strict'

import { Type, TypeFunc } from "../types/db-type.js";
import { TypeFG } from "../types/fg-type.js";
import { isNullable } from "../utils/utils.js";
import List from "./list-schema.js";

export class Schema {
	// Connector DB
	static connector = null;

	// Column name ID
	static fgName() {
		return this.name.toLowerCase() + "_id";
	}

	// Config
	static config = {};

	// Load model to database
	static async _load() {
		this.config.columnsObj = {};

		// Date columns
		if(this.config.createdAt)
			this.config.columns.created_at = { type: Type.DATETIME, required: true, default: () => new Date() };
		if(this.config.modifiedAt)
			this.config.columns.modified_at = { type: Type.DATETIME, required: true, default: () => new Date() };

		// Save pk name and copy config.columns
		for (const columnName in this.config.columns) {
			if (Object.hasOwnProperty.call(this.config.columns, columnName)) {
				if(typeof this.config.columns[columnName].pk == "number")
					this.config.pkName = columnName;
				this.config.columnsObj[columnName.camelCase("_")] = this.config.columns[columnName];
			}
		}

		// Fg
		for (let i = 0; i < this.config.fg.length; i++) {
			const { model, ...fgConfig } = this.config.fg[0];
			model.config.dpFg.push({ model: this, ...fgConfig });

			if(fgConfig.type == TypeFG.OneToOne)
				this.config.unique.push(`${model.name.toLowerCase()}_id`);
		}

		await this.connector.load();
	}


	// Obtención de datos
	static _getObj(dataDB) {
		return new this(dataDB);
	}

	static async get(id) {
		const dataDB = await this.connector.getElementById(id);
		if(!dataDB)
			return null;
		
		return await this._getObj(dataDB)._load();
	}
	static async getBy(key, id) {
		const dataDB = await this.connector.constructor.getElementById(this.connector.table, key, id);
		if(!dataDB)
			return null;
		return await this._getObj(dataDB)._load();
	}
	static async getAll(index=0, limit=null) {

	}
	static async add(data) {
		// Ojo al createdAt
	}
	static async delete() {

	}
	static async deleteAll(index=0, limit=null) {

	}
	static async getSize() {

	}



	// OBJECT
	constructor(data) {
		for (const columnName in this.constructor.config.columnsObj) {
			if (Object.hasOwnProperty.call(this.constructor.config.columnsObj, columnName)) {
				const clName = columnName.camelToSnakeCase();
				this._addColumn(columnName, this.constructor.config.columnsObj[columnName], data[clName]);
				delete data[clName];
			}
		}
		Object.defineProperty(this, `tempData`, { value: data, configurable: true });
	}

	async save() {
		const dataDB = {};
		const pkName = this.constructor.config.pkName;
		for (const columnName in this.constructor.config.columns) {
			if (Object.hasOwnProperty.call(this.constructor.config.columns, columnName)) {
				if(pkName == columnName)
					continue;
				if(this[columnName.camelCase("_")] == this["_" + columnName.camelCase("_")])
					continue;
				dataDB[columnName] = this.constructor.connector.constructor.TypeFunc[this.constructor.config.columns[columnName].type].d(this[columnName.camelCase("_")]);
				this["_" + columnName.camelCase("_")] = this[columnName.camelCase("_")];
			}
		}

		if(Object.keys(dataDB).length > 0) {
			// Ojo al modifiedAt
			await this.constructor.connector.updateElementById(dataDB, this.id);
		}
		return this;
	}

	async delete() {
		delete this;
	}


	// Private functions

	_addColumn(name, descriptor, value) {
		const isPK = typeof descriptor.pk == "number" ? true : false;
		console.log(value);
		value = this.constructor.connector.constructor.TypeFunc[descriptor.type].o(value);
		console.log(value);
		console.log("----------");

		Object.defineProperty(this, name, { value, writable: !isPK, enumerable: true });
		if(isPK)
			Object.defineProperty(this, `pk`, { get: function() { return this[name] } });
		else {
			Object.defineProperty(this, "_" + name, { value, writable: !isPK, enumerable: false });
			Object.defineProperty(this, "set" + name.charAt(0).toUpperCase() + name.slice(1), { value: function(value) {
				if(isNullable(value)) {
					if(!isNullable(descriptor.default))
						value = typeof descriptor.default == "function" ? descriptor.default.bind(this)() : descriptor.default;
					else if(descriptor.required)
						throw new Error(`Valor requerido`);
					else
						value = null;
				}
				else if(!TypeFunc[descriptor.type](value))
					throw new Error(`Tipo inválido`);
				else if(Array.isArray(descriptor.values) && !descriptor.values.includes(value))
					throw new Error(`Valor no encontrado en values`);

				// Size
				if(descriptor.type == Type.STRING && descriptor.size < value.length)
					throw new Error("Tamaño excedido");
				
				this[name] = value;
				return this;
			} });
		}
	}

	async _load() {
		await this._loadFg();
		await this._loadDpFg();
		return this;
	}

	async _loadFg(def = {}) {
		//console.log(this.tempData);
		for (const fg of this.constructor.config.fg) {
			if(fg.required && isNullable(this.tempData[fg.model.fgName()]))
				throw new Error(`Falta el valor de una clave foranea: ${fg.model.fgName()}`);

			var value = null;
			if(def.hasOwnProperty(fg.model.fgName()))
				value = def[fg.model.fgName()];
			else {
				const dataDB = await fg.model.connector.constructor.getElementById(fg.model.connector.table, fg.model.config.pkName, this.tempData[fg.model.fgName()]);
				value = !dataDB ? null : fg.model._getObj(dataDB);
				await value._loadFg();
				await value._loadDpFg({
					[this.constructor.name.toLowerCase()]: this
				});
			}

			Object.defineProperty(this, fg.model.name.toLowerCase(), {
				value,
				enumerable: true
			});
		}
		delete this.tempData;
		return this;
	}

	async _loadDpFg(def = {}) {
		for (const dpFg of this.constructor.config.dpFg) {
			if(dpFg.type == TypeFG.OneToOne) {
				var value = null;
				if(def.hasOwnProperty(dpFg.model.name.toLowerCase()))
					value = def[dpFg.model.name.toLowerCase()];
				else {
					const dataDB = await dpFg.model.connector.constructor.getElementById(dpFg.model.connector.table, this.constructor.fgName(), this.pk);
					var value = !dataDB ? null : dpFg.model._getObj(dataDB);
					await value._loadFg({ [this.constructor.fgName()]: this });
					await value._loadDpFg();
				}
				Object.defineProperty(this, dpFg.model.name.toLowerCase(), {
					value,
					enumerable: true,
					writable: true,
				});
			}
			else if(dpFg.type == TypeFG.ManyToOne) {
				Object.defineProperty(this, dpFg.model.name.toLowerCase() + "List", {
					value: new List(this, dpFg.model),
					enumerable: true,
				});
			}
		}
		return this;
	}
}