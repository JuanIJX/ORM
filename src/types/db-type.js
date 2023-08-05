import { isFloat, isInteger } from "@ijx/utils";

export const Type = {
	INT: 0,
	UINT: 1,
	FLOAT: 2,
	STRING: 3,
	TEXT: 4,
	DATE: 5,
	DATETIME: 6,
	BOOLEAN: 7,
};

export const TypeCheck = {
	[Type.INT]: data => isInteger(data),
	[Type.UINT]: data => isInteger(data) && data >= 0,
	[Type.FLOAT]: data => isFloat(data),
	[Type.STRING]: data => typeof data == "string",
	[Type.TEXT]: data => typeof data == "string",
	[Type.DATE]: data => data instanceof Date,
	[Type.DATETIME]: data => data instanceof Date,
	[Type.BOOLEAN]: data => data === true || data === false,
};