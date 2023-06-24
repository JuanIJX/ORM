import { Schema, Type, TypePK } from "../../src/index.js"
import User from "./user.model.js"

export default class Session extends Schema {
	static config = {
		pk: "token",
		columns: {
			token: { type: Type.STRING, size: 64, pk: TypePK.NONE },
			name: { type: Type.STRING },
			password: { type: Type.STRING },
			state: { type: Type.INT, values: [ 3, 4 ] },
		},
		unique: [ "name" ],
		createdAt: true,
		modifiedAt: true,
		fg: [{ model: User }],
	};
}