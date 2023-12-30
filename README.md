# ORM (beta)

Object-Relational mapping

## Installation

Use the package manager npm to install ORM.

```bash
npm install @ijx/orm
```

## Documentation
***All models should be inherit Schema***

You can easy switch mysql versions (mysql/mysql2) in file ./src/connectors/mysql-conn.js line 2
```js
import MysqlPool from "../drivers/MySQL_pool.js";
```
```js
import MysqlPool from "../drivers/MySQL_pool2.js";
```

### List schema static functions

```typescript
/**
 * Get element by ID
 * @param id PK value
 * @return schema with data
 */
get(id: string|number): Promise<Schema>
/**
 * Get element by other ID
 * @param key: column name
 * @param id value
 * @return schema with data
 */
getBy(key: string, id: string|number): Promise<Schema>
/**
 * Get array of elements (ORDER BY coming soon)
 * @param where where conditions to filter
 * @param limit number of elements
 * @param offset initial value to get elements
 * @return array of elements
 */
getAll(where?: Where, limit?: number|null, offset?: number): Promise<Schema[]>
/**
 * Add new element
 * @param dataDB Object with data
 * @param checkExists Check if the value already exists, no insert if exists
 * @return checkExists == true ? Schema : null
 */
add(dataDB: object, checkExists?: boolean): Promise<Schema|null>
/**
 * Delete element by ID
 * @param id PK value
 * @return true if element is deleted
 */
delete(id: string|number): Promise<boolean>
/**
 * Delete multiple elements
 * @param where where conditions to filter
 * @param limit number of elements
 * @param offset initial value to delete elements
 * @return number of elements deleted
 */
deleteAll(where?: Where, limit?: number|null, offset?: number): Promise<number>
/**
 * Get number of elements
 * @param where where conditions to filter
 * @return number of elements
 */
count(where?: Where): Promise<number>
```

 ### List schema functions
 ```typescript
 /**
  * Set value to attribute
  * @param value data
  * @return schema
  */
 setExampleAttribute...(value: any): Schema
 /**
  * Save schema
  * @return number of changed attributes
  */
 save(): Promise<number>
 /**
  * Delete schema
  */
 delete(): Promise<void>
 /**
  * Devuelve un objeto para transformar en json
  */
 toObject(): Object
 /**
  * Transform schema to json string
  */
 toJSON(replacer?: (this: any, key: string, value: any) => any, space?: string | number): string
 ```

 ### TypePK
 Specifies the type of primary key:
 - AUTO: Autogenerate primary key
 - NONE: Required to specify primary key

 ### Column types
- INT
- UINT
- FLOAT
- STRING
- TEXT
- DATE
- DATETIME
- BOOLEAN
 

## Examples

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
		createdAt: true, // Auto generated in db: created_at
		modifiedAt: false, // Auto generated in db: modified_at
	};
}
```

### Example use
```javascript
import { Where, Cmp } from "@ijx/orm";
import User from "./models/user.model.js"

const user = await User.get(2);
user
	.setBlock(true)
	.setDisplayname("displayed2")
	.setVerifyLevel(1);
await user.save();
console.log(user.toJSON());

const users = await User.getAll(
	Where.AND(
		Cmp.EQ("username", "usuario1"),
		Cmp.GE("verify_level", 1)
	)
);
```
