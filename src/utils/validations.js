import { isClass, isInteger, isNullable, isTypeNotNull, isTypeStringNotEmpty } from "@ijx/utils";
import { Type, TypeCheck } from "../types/db-type.js";
import { TypePK } from "../types/pk-type.js";
import { newError } from "../libs/error.js";
import { Connector } from "../types/connectors.js";
import { Schema } from "../libs/schema.js";
import { TypeFG } from "../types/fg-type.js";

const validateTableName = tableName => (/^[A-Za-z_][A-Za-z0-9_$]*$/).test(tableName);
const validateColumn = column => {
	if(!isTypeNotNull(column, "object"))
		throw newError(`'debe ser un objeto`);

	// Type
	if(!Object.values(Type).includes(column.type))
		throw newError(`type '${column.type}' erróneo`);
	
	// Cosas que hacer en algun Type
	if(column.type == Type.INT) {
		if(isNullable(column.size))
			column.size = 11;
	}
	if(column.type == Type.STRING) {
		if(isNullable(column.size))
			column.size = 32;
	}

	// Values
	if(!isNullable(column.values)) {
		if(!Array.isArray(column.values) || column.values.length == 0)
			throw newError(`values debe ser un array con algún valor`);
		if(column.values.some(v => typeof v != typeof column.values[0] || (typeof v == "object" && v.constructor.name != column.values[0].constructor.name)))
			throw newError(`todos los elementos de values deben ser del mismo tipo`);
		if(column.values.hasDuplicates())
			throw newError(`no puede haber elementos repetidos en values`);
	}

	// Size
	if(!isNullable(column.size)) {
		if(!isInteger(column.size))
			throw newError(`column.size debe ser un entero`);
		else if(column.size <= 0)
			throw newError(`column.size debe ser positivo`);
	}

	// Required
	column.required = isNullable(column.required) ? false : column.required;
	if(typeof column.required != "boolean")
		throw newError(`column.required debe ser TRUE o FALSE`);

	// PK
	if(!isNullable(column.pk) && !Object.values(TypePK).includes(column.pk))
		throw newError(`PRIMARY KEY type erróneo`);

	// Default
	switch (column.default) {
		case null: break;
		case undefined: break;
		default:
			const defVal = typeof column.default == "function" ? column.default() : column.default;
			if(!TypeCheck[column.type](defVal))
				throw newError(`valor default erróneo '${defVal}'`);
			break;
	}
	
	return true;
}
const validateColumns = columns => {
	if(!isTypeNotNull(columns, "object"))
		throw newError(`columns debe ser un objeto`);
	if(Object.keys(columns).length == 0)
		throw newError(`columns debe contener al menos un dato`);

	let key;
	try {
		let cn = 0;
		for (key in columns) {
			if (Object.prototype.hasOwnProperty.call(columns, key)) {
				validateColumn(columns[key]);
				if(!isNullable(columns[key].pk))
					cn++;
			}
		}
		
		// PK
		if(cn != 1)
			throw newError(`se necesita 1 una PRIMARY KEY y hay: ${cn}`);

	} catch (error) {
		error.message = `'${key}' ${error.message}`;
		throw error;
	}
	return true;
}
const validateConfig = config => {
	if(!isTypeNotNull(config, "object"))
		throw newError(`la config debe ser un objeto`);

	// Table validation
	if(!validateTableName(config.table))
		throw newError(`table debe ser un string válido`);

	// createdAt
	config.createdAt = config.createdAt === true ? true : false;
	if(config.createdAt && Object.keys(config.columns).includes(`created_at`))
		throw newError(`columns no puede tener el campo 'created_at'`);

	// modifiedAt
	config.modifiedAt = config.modifiedAt === true ? true : false;
	if(config.modifiedAt && Object.keys(config.columns).includes(`modified_at`))
		throw newError(`columns no puede tener el campo 'modified_at'`);

	// Columns
	validateColumns(config.columns);

	// Unique
	if(isNullable(config.unique))
		config.unique = [];
	else if(Array.isArray(config.unique)) {
		const repArry2 = [];
		for (let j = 0; j < config.unique.length; j++) {
			if(Array.isArray(config.unique[j])) {
				const uniqueColArry = config.unique[j];
				const repArry = [];
				for (let i = 0; i < uniqueColArry.length; i++) {
					if(Schema.isPrototypeOf(uniqueColArry[i])) {
						if(!config.fg.some(fg => fg.model === uniqueColArry[i]))
							throw newError(`la columna única '${uniqueColArry[i].name}' debe pertenecer a una clave foránea`);
						uniqueColArry[i] = uniqueColArry[i].fgName();
					}
					else if(!Object.keys(config.columns).includes(uniqueColArry[i]))
						throw newError(`la columna única '${uniqueColArry[i]}' debe pertenecer a una de las columnas`);

					if(repArry.includes(uniqueColArry[i]))
						throw newError(`restricción única repetida ${uniqueColArry[i]}`);
					repArry.push(uniqueColArry[i]);
				}
			}
			else if(Schema.isPrototypeOf(config.unique[j])) {
				if(!config.fg.some(fg => fg.model === config.unique[j]))
					throw newError(`la columna única '${config.unique[j].name}' debe pertenecer a una clave foránea`);
				config.unique[j] = config.unique[j].fgName();
			}
			else if(!Object.keys(config.columns).includes(config.unique[j]))
				throw newError(`la columna única '${config.unique[j]}' debe pertenecer a una de las columnas`);

			if(repArry2.includes(config.unique[j]))
				throw newError(`restricción única repetida ${config.unique[j]}`);
			repArry2.push(config.unique[j]);
		}
	}
	else
		throw newError(`valor de config.unique erróneo`);

	// Foreigns (evaluar cuando esten todas las tablas introducidas)
	if(isNullable(config.fg))
		config.fg = [];
	else
	{
		if(!Array.isArray(config.fg))
			throw newError(`fg debe ser un Array`)
		if(config.fg.hasDuplicates())
			throw newError(`no puede haber elementos repetidos fg`);

		for (let i = 0; i < config.fg.length; i++) {
			const fg = config.fg[0];

			// Model
			if(isNullable(fg.model))
				throw newError(`fg[${0}] no existe model`);
			if(fg.model.prototype instanceof Schema == false)
				throw newError(`fg[${0}] debe extender de Schema`);

			// Column conflict
			if(config.columns.hasOwnProperty(fg.model.fgName()))
				throw newError(`fg[${0}] entra en conflicto con ${fg.model.fgName()}`);
			
			// Type
			if(isNullable(fg.type))
				fg.type = TypeFG.ManyToOne;
			else if(!Object.values(TypeFG).includes(fg.type))
				throw newError(`model(${fg.model.name}) fg.type no tiene un valor correcto`);
			
			// Required
			if(isNullable(fg.required))
				fg.required = true;
			else if(typeof fg.required != "boolean")
				throw newError(`model(${fg.model.name}) fg.required debe ser TRUE o FALSE`);

			// On delete
			if(isNullable(fg.delete))
				fg.delete = true;
			else if(typeof fg.delete != "boolean")
				throw newError(`model(${fg.model.name}) fg.delete debe ser TRUE o FALSE`);

			// On update
			if(isNullable(fg.update))
				fg.update = false;
			else if(typeof fg.update != "boolean")
				throw newError(`model(${fg.model.name}) fg.update debe ser TRUE o FALSE`);
		}
	}

	// Foreigns dependientes
	config.dpFg = [];

	// Order
	config.orderType = typeof config.orderType == "boolean" ? config.orderType : true;
	if(isNullable(config.orderBy))
		config.orderBy = config.createdAt ? ["created_at"] : [];
	else {
		for (let i = 0; i < config.orderBy.length; i++) {
			if(Schema.isPrototypeOf(config.orderBy[i])) {
				if(!config.fg.some(fg => fg.model === config.orderBy[i]))
					throw newError(`la columna order by '${config.orderBy[i].name}' debe pertenecer a una clave foránea`);
				config.orderBy[i] = config.orderBy[i].fgName();
			}
			else if(!Object.keys(config.columns).includes(config.orderBy[i]))
				throw newError(`la columna order by '${config.orderBy[i]}' debe pertenecer a una de las columnas`);
		}
	}

	return true;
}

export const validateEntity = entity => {
	try {
		if(!isClass(entity))
			throw newError("Clase inválida");

		if(!isTypeStringNotEmpty(entity.config.table))
			entity.config.table = entity.name.camelToSnakeCase().slice(1);

		// Config validation
		validateConfig(entity.config);
	} catch (error) {
		error.message = `(${entity.name}) ${error.message}`;
		throw error;
	}

	return true;
}

export const validateDbConfig = config => {
	if(!isTypeNotNull(config, "object"))
			throw newError(`la config debe ser un objeto`);

		// Check host
		if(!isTypeStringNotEmpty(config.host))
			throw newError("host inválido");

		// Check port
		if(isNullable(config.port))
			config.port = 3306;
		else if(!isInteger(config.port))
			throw newError("port debe ser un numero entero");
		else {
			config.port = parseInt(config.port);
			if(config.port < 1 || config.port > 65_535)
				throw newError("port debe estar comprendido entre 1 y 65535");
		}

		// Check user
		if(!isTypeStringNotEmpty(config.user))
			throw newError("user debe ser una cadena no vacía");

		// Check pass
		if(isNullable(config.pass))
			config.pass = "";
		else if(typeof config.pass != "string")
			throw newError("pass debe ser una cadena");

		// Check name
		if(!isTypeStringNotEmpty(config.name))
			throw newError("bd name debe ser una cadena no vacía");

		// Check pref
		if(isNullable(config.pref))
			config.pref = "";
		else if(typeof config.pref != "string")
			throw newError("pref debe ser una cadena");
}

export const validateInitConfig = config => {
	if(!isTypeNotNull(config, "object"))
		throw newError(`config inválida`);

	if(!isTypeNotNull(config.db, "object"))
		throw newError(`config.db inválido`);
	
	if(isNullable(config.db.conn))
		throw newError(`config.db.conn se debe especificar`);
	if(!Object.values(Connector).includes(config.db.conn))
		throw newError(`config.db.conn debe pertenecer a Connector`);
}