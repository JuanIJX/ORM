# ORM

### Example Load
```javascript
import ORM, { Connector } from "../src/index.js"

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
```

### Example use
```javascript
import User from "./models/user.model.js"

const user = await User.get(2);
	user
		.setBlock(true)
		.setDisplayname("displayed2");
	await user.save();
```
