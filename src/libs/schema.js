export class Schema {
	// Connector DB
	static connector = null;

	// Config
	static config = {};

	// Load model to database
	static async _load() {
		await this.connector.load();
	}


	// Obtención de datos
	static getById() {
		const model = new this();
		return model;
	}
}