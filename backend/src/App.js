const debug = require('debug')('app');
const WebServer = require('./server/WebServer');
const { logger } = require('./service/logger');
const config = require('config');
const moment = require('moment');
const mongoose = require('mongoose');
const Redis = require('ioredis');
const redis = new Redis(config.redis, { lazyConnect: true });

require('./model')

class App {
	constructor() {
		this.webServer = new WebServer();
		this.uptime = moment().unix();
	}

	async open() {
		logger.info(`application starting ..., pid: ${process.pid}`);

		await this.openRedis();
		await this.openDatabase();
		await this.openWebServer();
	}

	async close() {
		await this.closeRedis();
		await this.closeWebServer();
		await this.closeDatabase();
		logger.info('application closed.');
	}

	async openRedis() {
		await redis.connect();
		logger.info(`redis connected OK: ${config.redis}`);
	}

	async closeRedis() {
		redis.quit();
		logger.info('redis closed.');
	}

	async openDatabase() {
		try {
			await mongoose.connect(config.db, {
				useNewUrlParser: true,
				useUnifiedTopology: true,
				useFindAndModify: false,
				useCreateIndex: true
			});
			logger.info(`mongodb connected OK: ${config.db}`);
		} catch (err) {
			logger.error(`mongodb connected FAILED: ${config.db}`)
		}
	}

	async closeDatabase() {
		await mongoose.connection.close();
		logger.info('mongodb closed.');
	}

	async openWebServer() {
		await this.webServer.open();
		this.webServer.koa.context.app = this;
		this.webServer.koa.context.logger = logger;
		this.webServer.koa.context.redis = redis;
	}

	async closeWebServer() {
		await this.webServer.close();
	}
}

module.exports = new App();