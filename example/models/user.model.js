import { Schema, Type, TypePK } from "../../src/index.js"

export default class User extends Schema {
	static config = {
		columns: {
			id:				{ type: Type.UINT, size: 11, pk: TypePK.AUTO },
			username:		{ type: Type.STRING, size: 32,	required: true },
			displayname:	{ type: Type.STRING, size: 100 },
			password:		{ type: Type.STRING, size: 128,	required: true },
			email:			{ type: Type.STRING, size: 60,	required: true },
			phone:			{ type: Type.STRING, size: 12 },
			block:			{ type: Type.BOOLEAN, required: true, default: false },
			verify_level:	{ type: Type.UINT, values: [0, 1, 2] },
		},
		unique: [ "username" ],
		createdAt: true,
		modifiedAt: false,
	};
}