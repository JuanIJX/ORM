import ORM, { Connector } from "../src/index.js"
import { wait } from "../src/utils/utils.js";

import Session from "./models/session.model.js";
import User from "./models/user.model.js"

try {
	await ORM.addEntities([ Session, User ]).init({
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

	await wait(1000);
	await ORM.close();
} catch (error) {
	console.log("ERROR GENERAL:");
	console.log(error);
}