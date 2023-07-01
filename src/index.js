export const version = "tempVersion.0.0"
export * from "./libs/orm.js"
export * from "./libs/schema.js"

export * from "./types/connectors.js"
export * from "./types/db-type.js"
export * from "./types/pk-type.js"
export * from "./types/fg-type.js"

import { ORM } from "./libs/orm.js"
export default ORM