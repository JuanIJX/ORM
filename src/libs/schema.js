'use strict'

import { Type, TypeCheck } from "../types/db-type.js";
import { TypeFG } from "../types/fg-type.js";
import { TypePK } from "../types/pk-type.js";
import { isNullable } from "@ijx/utils";
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
	};

	// Load model to database
	static async _load() {
		// Date columns
		if(this.config.createdAt)
			this.config.columns.created_at = { type: Type.DATETIME, required: true, default: () => new Date() };
		if(this.config.modifiedAt)
			this.config.columns.modified_at = { type: Type.DATETIME, required: true, default: () => new Date() };

		// Save pk info
		for (const columnName in this.config.columns) {
			if (Object.hasOwnProperty.call(this.config.columns, columnName)) {
				const descriptor = this.config.columns[columnName];
				if(typeof descriptor.pk == "number") {
					this.config.pkName = columnName;
					this.config.pkType = descriptor.type;
					this.config.pkAuto = descriptor.pk;
				}
			}
		}

		// Fg
		for (let i = 0; i < this.config.fg.length; i++) {
			const { model, ...fgConfig } = this.config.fg[i];
			model.config.dpFg.push({ model: this, ...fgConfig });
			if(fgConfig.type == TypeFG.OneToOne)
				this.config.unique.push(model.fgName());
		}

		await this.connector.load();
	}

	// Validate add data columns
	// Añade las columnas que faltan automaticamente (createdAt, modifiedAt y default values)
	static _validateData(data) {
		const dataVal = {};

		for (const key in this.config.columns) {
			const descriptor = this.config.columns[key];

			if(isNullable(data[key])) {
				if(typeof descriptor.pk == "number") {
					if(descriptor.pk != TypePK.AUTO)
						throw new Error(`(${key}) Falta la clave primaria`);
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

				if(!TypeCheck[descriptor.type](data[key]))
					throw new Error(`(${key}) Tipo inválido`);
				else if(Array.isArray(descriptor.values) && !descriptor.values.includes(data[key]))
					throw new Error(`(${key}) Valor no encontrado en values`);

				if(descriptor.type == Type.STRING && descriptor.size < data[key].length)
					throw new Error(`(${key}) Tamaño excedido`);

				dataVal[key] = this.connector.constructor.TypeFunc[descriptor.type].d(data[key]);
			}
		}

		// Aseguramos que en add no falte las claves fg si se requieren
		for (const fg of this.config.fg) {
			let fgValue = data[fg.model.fgName()];
			if(isNullable(fgValue)) {
				if(fg.required)
					throw new Error(`Falta la clave foránea obligatoria: ${fg.model.fgName()}`);
				fgValue = null;
			}
			else if(!(fgValue instanceof fg.model) && !TypeCheck[fg.model.config.pkType](fgValue))
				throw new Error(`(${fg.model.fgName()}) Tipo inválido`);
			dataVal[fg.model.fgName()] = fgValue instanceof fg.model ? fgValue[fg.model.config.pkName] : fgValue;
		}
		return dataVal;
	}


	// Obtención de datos
	// * la data debe venir desde la BD
	static _getObj(dataDB) {
		return new this(dataDB);
	}

	static async get(id) {
		let dataDB = await this.connector.getElementByIdLeftJoin(id);
		if(!dataDB)
			return null;
		return this._getObj(dataDB);
	}
	static async getBy(key, id) {
		let dataDB = await this.connector.constructor.getElementById(this.connector.table, key, id);
		if(!dataDB)
			return null;
		return this._getObj(dataDB);
	}
	static async getAll(where=null, limit=null, offset=0) {
		const objs = [];
		const dataDB = await this.connector.getElements(null, where, ["created_at"], true, limit, offset) ?? [];
		for (const userDB of dataDB)
			objs.push(this._getObj(userDB));
		return objs;
	}
	static async add(dataDB) {
		dataDB = this._validateData(dataDB);
		const lastID = await this.connector.addElement(dataDB);
		if(this.config.pkAuto == TypePK.AUTO)
			dataDB[this.config.pkName] = lastID;
		return this._getObj(dataDB);
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
		this.constructor.config.columns.forEach((descriptor, columnName) => this._addColumn(columnName.camelCase("_"), descriptor, data[columnName]));
		this.constructor.config.fg.forEach(fg => this._addFg(fg, data[fg.model.fgName()]));
		this.constructor.config.dpFg.forEach(fg => {
			if(fg.type == TypeFG.ManyToOne)
				Object.defineProperty(this, fg.model.attrName() + "List", { value: new List(this, fg.model) , enumerable: true });
			else
				this._addDpFg(fg, data[this.constructor.connector.pref + fg.model.fgName()]);
		});
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
				dataDB[columnName] = this["_" + columnName.camelCase("_")] = this[columnName.camelCase("_")];
			}
		}
		for (const fg of this.constructor.config.fg) {
			const fgName = fg.model.fgName();
			if(this["_" + fgName] == this[fgName])
				continue;
			dataDB[fgName] = this["_" + fgName] = this[fgName];
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

	toJSON(replacer, space) {
		const data = {};
		this.constructor.config.columns.forEach((_, columnName) => data[columnName] = this[columnName.camelCase("_")]);
		this.constructor.config.fg.forEach(fg => data[fg.model.fgName()] = this["_" + fg.model.fgName()]);
		this.constructor.config.dpFg.forEach(fg => {
			if(fg.type == TypeFG.ManyToOne)
				return;
			data[fg.model.fgName()] = this["_" + fg.model.fgName()]
		});
		return JSON.stringify(data, replacer, space);
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
				if(value === undefined) {
					if(!isNullable(descriptor.default))
						value = typeof descriptor.default == "function" ? descriptor.default.bind(this)() : descriptor.default;
					else if(descriptor.required)
						throw new Error(`No hay default para '${name}' y es requerido`);
					else
						value = null;
				}
				else if(value === null) {
					if(descriptor.required)
						throw new Error(`Valor de '${name}' no puede ser null`);
					else
						value = null;
				}
				else if(!TypeCheck[descriptor.type](value))
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

	_addFg(fg, id) {
		const model = fg.model;
		const fgName = model.fgName();
		const attrName = model.attrName();
		Object.defineProperty(this, "_" + fgName, { value: id, writable: true });
		Object.defineProperty(this, fgName, { value: id, writable: true, enumerable: true });
		Object.defineProperty(this, attrName, { get: async function() { return isNullable(this["_" + fgName]) ? null : await model.get(this["_" + fgName]); }, enumerable: true });
		Object.defineProperty(this, "set" + attrName.charAt(0).toUpperCase() + attrName.slice(1), { value: function(value) {
			if(isNullable(value)) {
				if(fg.required)
					throw new Error(`Valor de '${attrName}' no puede ser null`);
				value = null;
			}
			else if(!TypeCheck[model.config.pkType](value) && !(value instanceof model))
				throw new Error(`Tipo inválido`);
			this[fgName] = value instanceof model ? value._id : value;
			return this;
		} });
	}

	_addDpFg(fg, id) {
		const model = fg.model;
		const fgName = model.fgName();
		const attrName = model.attrName();

		Object.defineProperty(this, "_" + fgName, { value: id, writable: true });
		//Object.defineProperty(this, fgName, { value: id, writable: true, enumerable: true });
		Object.defineProperty(this, attrName, { get: async function() { return isNullable(this["_" + fgName]) ? null : await model.get(this["_" + fgName]); }, enumerable: true });
		/*Object.defineProperty(this, "set" + attrName.charAt(0).toUpperCase() + attrName.slice(1), { value: function(value) {
			if(isNullable(value)) {
				if(fg.required)
					throw new Error(`Valor de '${attrName}' no puede ser null`);
				value = null;
			}
			else if(!TypeCheck[model.config.pkType](value) && !(value instanceof model))
				throw new Error(`Tipo inválido`);
			this[fgName] = value instanceof model ? value._id : value;
			return this;
		} });*/
	}

	////////// EN DESUSO
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