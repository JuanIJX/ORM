import { Schema } from "./schema.js";

export default class List {
	constructor(objectEntity, entity) {
		if(!(objectEntity instanceof Schema))
			throw new Error(`object inválido`);
		if(!Schema.isPrototypeOf(entity))
			throw new Error(`entity inválido`);

		Object.defineProperty(this, `_obj`, { value: objectEntity });
		Object.defineProperty(this, `_entity`, { value: entity });

		Object.defineProperty(this, `id`, { value: this._obj.pk, enumerable: true });
	}

	async get(id) { return null; }
	async getAll(index=0, limit=null) {

	}
	async add(data) {

	}
	async delete() {

	}
	async deleteAll(index=0, limit=null) {

	}
	async getSize() {

	}
}