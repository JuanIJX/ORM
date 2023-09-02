import { Schema } from "./schema.js";
import { Cmp, Where } from "./where.js";

export default class List {
	constructor(objectEntity, entity) {
		if(!(objectEntity instanceof Schema))
			throw new Error(`object inválido`);
		if(!Schema.isPrototypeOf(entity))
			throw new Error(`entity inválido`);

		Object.defineProperty(this, `_obj`, { value: objectEntity });
		Object.defineProperty(this, `_entity`, { value: entity });
		Object.defineProperty(this, `_conn`, { value: entity.connector });

		Object.defineProperty(this, `id`, { value: this._obj._id, enumerable: true });
		Object.defineProperty(this, `size`, { get: async function() {
			return await this._conn.count(Cmp.EQ(this._obj.constructor.fgName(), this._obj._id));
		}, enumerable: true });
	}

	async get(id, ...where) {
		const dataDB = (await this._conn.getElements(null, Where.AND(
			Cmp.EQ(this._entity.config.pkName, id),
			Cmp.EQ(this._obj.constructor.fgName(), this._obj._id),
			...where
		)))[0];
		if(!dataDB)
			return null;
		return this._entity._getObj(dataDB);
	}
	async getAll(where=null, limit=null, offset=0) {
		where = [
			Cmp.EQ(this._obj.constructor.fgName(), this._obj._id),
			...(where === null ? [] : [where])
		];
		const objs = [];
		const dataDB = await this._conn.getElements(null, Where.AND(...where), this._entity.config.createdAt ? ["created_at"] : [], true, limit, offset);
		for (const userDB of dataDB)
			objs.push(this._entity._getObj(userDB));
		return objs;
	}
	async add(data) {
		return await this._entity.add({ data, [this._obj.constructor.fgName()]: this._obj._id})
	}
	async deleteAll(where=null, limit=null, offset=0) {
		where = [
			Cmp.EQ(this._obj.constructor.fgName(), this._obj._id),
			...(where === null ? [] : [where])
		];
		await this._conn.deleteElements(Where.AND(...where), limit, offset);
	}
}