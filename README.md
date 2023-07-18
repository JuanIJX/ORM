# ORM

Object-Relational mapping

## Installation

Use the package manager npm to install ORM.

```bash
npm install @ijx/orm
```

### Example Load
```javascript
import ORM, { Connector } from "@ijx/orm"

await ORM.addEntities([ User ]).init({
	db: {
		conn: Connector.MYSQL,
		host: "localhost",
		port: 3306,
		user: "user",
		pass: "password",
		name: "dbname",
		pref: "cig_"
	}
});
```

### Example model
```javascript
import { Schema, Type, TypePK } from "@ijx/orm"
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
