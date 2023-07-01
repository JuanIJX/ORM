import { Schema, Type, TypeFG, TypePK } from "../../src/index.js"
import User from "./user.model.js";

export default class Direccion extends Schema {
	static config = {
		columns: {
			id:					{ type: Type.UINT, size: 11, pk: TypePK.AUTO },
			pais:				{ type: Type.STRING, size: 32, required: true },
			ciudad:				{ type: Type.STRING, size: 50, required: true },
			codigo_postal:		{ type: Type.STRING, size: 7, required: true },
			calle:				{ type: Type.STRING, size: 100, required: true },
			numero:				{ type: Type.INT, size: 4, required: true },
			piso:				{ type: Type.STRING, size: 10, required: false },
			puerta:				{ type: Type.STRING, size: 10, required: false },
		},
		unique: [],
		modifiedAt: true,
		fg: [
			{
				model: User,
				required: true,
				delete: true,
				update: true,
				type: TypeFG.OneToOne,
			}
		],
	};
}