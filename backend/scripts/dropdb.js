// NODE_ENV
if (!process.env.NODE_ENV) {
	process.env.NODE_ENV = 'development';
}
require('dotenv').config();
const debug = require('debug')('app:dropdb');
const config = require('config');
const mongoose = require('mongoose');

let app = async () => {
	try {
		debug(`[${process.env.NODE_ENV}] ${config.get('db')}`);

		await mongoose.connect(config.db);
		await mongoose.connection.dropDatabase();

		await mongoose.connection.close();
	} catch (error) {
		debug(error);
	} finally {
		process.exit(0);
	}
};

app();
