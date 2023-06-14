import { Collection } from "../utils/collection.js";
import { isClass } from "../utils/utils.js";

// FUNCTIONS
function validateColumn(column: any) {
	if(column === undefined || column === null) return false;
	if(typeof column != "object") return false;
	if(Object.keys(column).length == 0) return false;

	return true;
}
function validateColumns(columns: any): boolean {
	if(columns === undefined || columns === null) return false;
	if(typeof columns != "object") return false;
	if(Object.keys(columns).length == 0) return false;

	for (const key in columns)
		if (Object.prototype.hasOwnProperty.call(columns, key))
			if(!validateColumn(columns[key]))
				return false;

	return true;
}
function validateConfig(config: any): boolean {
	if(config === undefined || config === null) return false;
	if(typeof config != "object") return false;

	// Table

	// Columns
	if(!validateColumns(config.columns)) return false;

	// Funcs

	//if(!config.hasOwnProperty(`columns`))

	return false;
}

function validateEntity(entity: any): boolean {
	throw new Error("Clase inválida");
	return isClass(entity) && validateConfig(entity.config);
}


export class TypeID {
	static NONE = 0;
	static AUTO = 1;
};
export enum EnumTypeID {
	NONE = TypeID.NONE,
	AUTO = TypeID.AUTO,
}



export default class ORM {
	private static modules: Collection<string, any> = new Collection();

	static addEntity(entity: any) {
		validateEntity(entity);
			
		//console.log(entity.name);
		//this.modules.set(entity.name);
	}

	// INTERACTION

	static get() {
		return new this(0);
	}


	// OBJECT

	constructor(private _id: number) {

	}

	test() {
		console.log("X")
	}
}