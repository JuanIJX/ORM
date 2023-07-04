import ORM, { Connector } from "../src/index.js"
import { wait } from "../src/utils/utils.js";

import Session from "./models/session.model.js";
import User from "./models/user.model.js"
import Direccion from "./models/user_direccion.model.js";

try {
	await ORM.addEntities([ Session, Direccion, User ]).init({
		db: {
			conn: Connector.MYSQL,
			host: "m1.ijx.es",
			port: 3306,
			user: "test",
			pass: "test",
			name: "test",
			pref: "cig_"
		}
	});

	var user = await User.get(2);
	var dir = user.direccion;


	user.direccion = null;
	//delete user.direccion

	console.log(user);
	console.log(dir);
	console.log("||||||||||||||||||||||||");
	//const dir = await Direccion.get(11);
	//console.log(dir);

	await wait(1000);
	await ORM.close();
} catch (error) {
	console.log("ERROR GENERAL:");
	console.log(error);
}