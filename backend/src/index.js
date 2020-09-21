const debug = require('debug')('app');
const { logger } = require('./service/logger');
const app = require('./app');

if (!process.env.NODE_ENV) {
	process.env.NODE_ENV = 'development';
}

let main = async () => {
	await app.open();
};

let cleanup = async () => {
	await app.close();
	process.exit();
};

main().then().catch(err => {
	logger.error(err.stack);
});

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);