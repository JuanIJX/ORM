import MysqlPool from "../src/db-connectors/MySQL_pool.js";
import { Type } from "../src/index.js";
import { wait } from "../src/utils/utils.js";

function dbTypeParse(data) {
	const [a, ...b] = data.split(" ");
	const pos = a.indexOf("(");
	if(pos == -1) return [[a]];

	let c = a.substring(pos+1, a.length - 1);
	return [
		[ a.substring(0, pos), ...b ],
		c[0] == "'" ? c.split(",").map(item => item.replace(/'/g, "")) : c
	];
}


(async () => {
	/*const idbd = new MysqlPool("m1.ijx.es", "test", "test", "test", "", 3306);
	var err = await idbd.checkConn();
	if(err) {
		console.log("No se conectó");
		console.log(err);
	}
	else
		console.log("ok");*/

		console.log(dbTypeParse("float"))
		console.log(dbTypeParse("enum('3','4')"))
		console.log(dbTypeParse("varchar(64)"))
		console.log(dbTypeParse("int(4) unsigned zerofill"))



	//await idbd.close();
})();