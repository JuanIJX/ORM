import { Schema, Type, TypePK } from "../../src/index.js"

export default class User extends Schema {
	static config = {
		columns: {
			id: { type: Type.INT, pk: TypePK.AUTO },
			name: { type: Type.STRING },
			password: { type: Type.STRING },
			state: { type: Type.ENUM, values: [ 3, 4, 5, 6 ], default: 6, required: false },
		},
		unique: [ "name" ],
		createdAt: true,
		modifiedAt: true,
	};

	constructor() {
		console.log("constructor estatico");

		this.valorEnumerable = true;
		Object.defineProperty(this, `test5`, { value: "e", enumerable: true })
	}
}