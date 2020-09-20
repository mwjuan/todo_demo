const Logger = require('./service/Logger');
const moment = require('moment');

const Mongodb = require('./service/Mongodb');
const RedisService = require('./service/Redis');

/**
 * 程序上下文
 */
class AppContext {
	static get instance() {
		if (!this._instance) {
			this._instance = new AppContext();
		}
		return this._instance;
	}

	constructor() {
		if (AppContext._instance) {
			return AppContext._instance;
		}

		this.init();
	}

	init() {
		this.uptime = moment();

		this.logger = new Logger();
		this.mongodb = new Mongodb();
		this.redisService = new RedisService();
	}
}

module.exports = AppContext;
