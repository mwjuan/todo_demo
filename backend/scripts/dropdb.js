// NODE_ENV
if (!process.env.NODE_ENV) {
	process.env.NODE_ENV = 'development';
}
require('dotenv').config();
const debug = require('debug')('app:dropdb');
const config = require('config');
const AppContext = require('../src/AppContext');
const { mongodb } = AppContext.instance;

let app = async () => {
	try {
		debug(`[${process.env.NODE_ENV}] ${config.get('db')}`);

		await mongodb.open(config.get('db'));

		await mongodb.drop();

		await mongodb.close();
	} catch (error) {
		debug(error);
	} finally {
		process.exit(0);
	}
};

app();
