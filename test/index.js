import ORM, { TypeID, version } from "../dist/esm/index.js"
import User from "./models/user.model.js"

//ORM.initLoad();
ORM.addEntity(User);