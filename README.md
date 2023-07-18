# ORM

Object-Relational mapping

## Installation

Use the package manager npm to install ORM.

```bash
npm install @ijx/orm
```

### Example Load
```javascript
import ORM, { Connector } from "../src/index.js"

await ORM.addEntities([ User ]).init({
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

### Example model
```javascript
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
