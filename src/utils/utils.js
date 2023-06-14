export function isClass(entity) {
	console.log("testtts aact")
	return entity.prototype?.constructor?.toString()?.substring(0, 5) === 'class';
}