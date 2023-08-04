'use strict'

import { Type, TypeFunc } from "../types/db-type.js";
import { TypeFG } from "../types/fg-type.js";
import { TypePK } from "../types/pk-type.js";
import { isNullable } from "../utils/utils.js";
import { newError } from "./error.js";
import List from "./list-schema.js";

export class Schema {
	// Connector DB
	static connector = null;

	// Column name ID
	static fgName() { return this.name.camelToSnakeCase().slice(1) + "_id"; }
	static attrName() { return this.name[0].toLowerCase() + this.name.slice(1); }

	// Config
	static config = {
		table: "",
		createdAt: false,
		modifiedAt: false,
		pkName: null,
		pkType: null,
		pkAuto: null,
		fg: [],
		dpFg: [],

		columns: {},
		columnsObj: {},
	};

	// Load model to database
	static async _load() {
		this.config.columnsObj = {}
		
		// Date columns
		if(this.config.createdAt)
			this.config.columns.created_at = { type: Type.DATETIME, required: true, default: () => new Date() };
		if(this.config.modifiedAt)
			this.config.columns.modified_at = { type: Type.DATETIME, required: true, default: () => new Date() };

		// Save pk name and copy config.columns
		for (const columnName in this.config.columns) {
			if (Object.hasOwnProperty.call(this.config.columns, columnName)) {
				const descriptor = this.config.columns[columnName];
				if(typeof descriptor.pk == "number") {
					this.config.pkName = columnName;
					this.config.pkType = descriptor.type;
					this.config.pkAuto = descriptor.pk;
				}
				this.config.columnsObj[columnName.camelCase("_")] = descriptor;
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

	// Validate add data columns
	static _validateData(data) {
		const dataVal = {};

		for (const key in this.config.columns) {
			const descriptor = this.config.columns[key];

			if(!data.hasOwnProperty(key)) {
				if(typeof descriptor.pk == "number") {
					if(descriptor.pk != TypePK.AUTO)
						throw newError(`(${key}) Falta la clave primaria`);
				}
				else if(!isNullable(descriptor.default))
					dataVal[key] = this.connector.constructor.TypeFunc[descriptor.type].d(typeof descriptor.default == "function" ? descriptor.default.bind(this)() : descriptor.default);
				else if(descriptor.required)
					throw new Error(`(${key}) Valor requerido`);
				else
					dataVal[key] = null;
			}
			else {
				if(this.config.createdAt && key == "created_at")
					throw new Error(`No se puede introducir una fecha de creación`);
				if(this.config.modifiedAt && key == "modified_at")
					throw new Error(`No se puede introducir una fecha de modificación`);

				if(!TypeFunc[descriptor.type](data[key]))
					throw new Error(`(${key}) Tipo inválido`);
				else if(Array.isArray(descriptor.values) && !descriptor.values.includes(data[key]))
					throw new Error(`(${key}) Valor no encontrado en values`);

				if(descriptor.type == Type.STRING && descriptor.size < data[key].length)
					throw new Error(`(${key}) Tamaño excedido`);

				dataVal[key] = this.connector.constructor.TypeFunc[4].d(data[key]);
			}
		}

		// Aseguramos que en add no falte las claves fg si se requieren
		for (const fg of this.config.fg) {
			const fgValue = data[fg.model.fgName()];
			if(isNullable(fgValue)) {
				if(fg.required)
					throw new Error(`Falta la clave foránea obligatoria: ${fg.model.fgName()}`);
			}
			else if(!(fgValue instanceof fg.model) && !TypeFunc[fg.model.config.pkType](fgValue))
				throw new Error(`(${fg.model.fgName()}) Tipo inválido`);
			dataVal[fg.model.fgName()] = fgValue instanceof fg.model ? fgValue[fg.model.config.pkName] : fgValue;
		}
		return dataVal;
	}


	// Obtención de datos
	static _getObj(dataDB) {
		return new this(dataDB);
	}

	static async get(id, load=true) {
		let data = await this.connector.getElementById(id);
		if(!data)
			return null;
		data = this._getObj(data);
		if(!load)
			return data;
		return await data._load();
	}
	static async getBy(key, id, load=true) {
		let data = await this.connector.constructor.getElementById(this.connector.table, key, id);
		if(!data)
			return null;
		data = this._getObj(data);
		if(!load)
			return data;
		return await data._load();
	}
	static async getAll(where=null, limit=null, offset=0) {
		const users = [];
		const dataDB = await this.connector.getElements(null, where, ["created_at"], true, limit, offset) ?? [];
		for (const userDB of dataDB)
			users.push(this._getObj(userDB));
		return users;
	}
	static async add(data) {
		data = this._validateData(data);
		const lastID = await this.connector.addElement(data);
		if(this.config.pkAuto == TypePK.AUTO)
			data[this.config.pkName] = lastID;

		return this._getObj(data);
	}
	// ALERTA, cada deleteElement segun el conector puede devolver algo diferente
	static async delete(id) {
		return (await this.connector.deleteElementById(id))[0]?.affectedRows == 1;
	}
	static async deleteAll(where=null, limit=null, offset=0) {
		return await this.connector.deleteElements(where, limit, offset);
	}
	static async count(where=null) {
		return await this.connector.count(where);
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
		Object.defineProperty(this, `fgData`, { value: data, configurable: true });
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
			if(this.constructor.config.modifiedAt)
				dataDB[`modified_at`] = new Date();
			await this.constructor.connector.updateElementById(dataDB, this._id);
		}
		return this;
	}

	async delete() {
		await this.constructor.connector.deleteElementById(this._id);
		for (const fg of this.constructor.config.fg)
			this[fg.model.name.toLowerCase()][this.constructor.name.toLowerCase()] = null;
	}


	// Private functions
	_addColumn(name, descriptor, value) {
		const isPK = typeof descriptor.pk == "number" ? true : false;
		value = this.constructor.connector.constructor.TypeFunc[descriptor.type].o(value);

		Object.defineProperty(this, name, { value, writable: !isPK, enumerable: true });
		if(isPK)
			Object.defineProperty(this, `_id`, { value: this[name] });
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
		for (const fg of this.constructor.config.fg) {
			var value = null;
			if(def.hasOwnProperty(fg.model.fgName()))
				value = def[fg.model.fgName()];
			else {
				if(fg.required && isNullable(this.fgData[fg.model.fgName()]))
					throw new Error(`Falta el valor de una clave foranea (1): ${fg.model.fgName()}`);

				const dataDB = await fg.model.connector.constructor.getElementById(fg.model.connector.table, fg.model.config.pkName, this.fgData[fg.model.fgName()]);
				if(!dataDB) {
					if(fg.required)
						throw new Error(`Falta el valor de una clave foranea (2): ${fg.model.fgName()}`);
				}
				else {
					value = fg.model._getObj(dataDB);
					await value._loadFg();
					await value._loadDpFg({
						[this.constructor.attrName()]: this
					});
				}
			}
			this[fg.model.attrName()] = value;
		}
		delete this.fgData;
		return this;
	}

	async _loadDpFg(def = {}) {
		for (const dpFg of this.constructor.config.dpFg) {
			if(dpFg.type == TypeFG.OneToOne) {
				var value = null;
				if(def.hasOwnProperty(dpFg.model.attrName()))
					value = def[dpFg.model.attrName()];
				else {
					const dataDB = await dpFg.model.connector.constructor.getElementById(dpFg.model.connector.table, this.constructor.fgName(), this._id);
					if(dataDB) {
						value = dpFg.model._getObj(dataDB);
						await value._loadFg({ [this.constructor.fgName()]: this });
						await value._loadDpFg();
					}
					else
						value = "null";
				}
				this[dpFg.model.attrName()] = value;
			}
			else if(dpFg.type == TypeFG.ManyToOne)
				Object.defineProperty(this, dpFg.model.attrName() + "List", { value: new List(this, dpFg.model), enumerable: true, });
		}
		return this;
	}
}