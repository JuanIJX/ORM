export class Where {
	static AND = (...cmps) => new this("AND", cmps);
	static OR = (...cmps) => new this("OR", cmps);

	constructor(operator, cmps) {
		this.operator = operator;
		this.cmps = cmps;
	}

	entries() {
		const ret = [];
		for (const c of this.cmps)
			c instanceof Cmp ? ret.push([c.column, c.value]) : ret.push(...c.entries());
		return ret;
	}

	values() {
		const ret = [];
		for (const c of this.cmps)
			c instanceof Cmp ? ret.push(c.value) : ret.push(...c.values());
		return ret;
	}

	print() { return "(" + this.cmps.map(c => c.print()).join(` ${this.operator} `) + ")"; }
}

export class Cmp {
	static _cmpList = { eq: "=", ne: "!=", gt: ">", ge: ">=", lt: "<", le: "<=", };

	static EQ = (column, value) => new this("eq", column, value); // ==
	static NE = (column, value) => new this("ne", column, value); // !=
	static GT = (column, value) => new this("gt", column, value); // >
	static GE = (column, value) => new this("ge", column, value); // >=
	static LT = (column, value) => new this("lt", column, value); // <
	static LE = (column, value) => new this("le", column, value); // <=

	constructor(cp, column, value) {
		this.cp = cp;
		this.column = column;
		this.value = value;
	}

	values() { return [this.value]; }
	print(char='\`') { return `${char}${this.column}${char} ${this.constructor._cmpList[this.cp]} ?`; }
}