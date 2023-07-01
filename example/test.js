import MysqlPool from "../src/db-connectors/MySQL_pool.js";
import { Type } from "../src/index.js";
import { wait } from "../src/utils/utils.js";



(async () => {
	/*const idbd = new MysqlPool("m1.ijx.es", "test", "test", "test", "", 3306);
	var err = await idbd.checkConn();
	if(err) {
		console.log("No se conectó");
		console.log(err);
	}
	else
		console.log("ok");*/

	var values = [
		"tablita", {
			a: "aa",
			b: "bb",
			c: "cc",
		},
		"pkName",
		"idvalue"
	];

	const [table, data, ...cosa] = values;
	const campos = [];

	for (const key in data) {
		campos.push(`${key} = ?`);
		cosa.unshift(data[key]);
	}
	cosa.unshift(table);

	console.log(table);
	console.log(data);
	console.log(cosa);
	console.log(`UPDATE ?? SET ${campos.join(", ")} WHERE ?? = ?`);






	//await idbd.close();
})();