import { Schema, Type, TypeFG, TypePK } from "../../src/index.js"
import User from "./user.model.js"

export default class Session extends Schema {
	static config = {
		pk: "token",
		columns: {
			token: { type: Type.STRING, size: 64, pk: TypePK.NONE },
			name: { type: Type.STRING },
		},
		unique: [ "name" ],
		createdAt: false,
		modifiedAt: false,
		fg: [
			{
				model: User,
				required: false,
				delete: true,
				update: false,
				type: TypeFG.ManyToOne,
			}
		],
	};
}