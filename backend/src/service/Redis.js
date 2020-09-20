const Redis = require('ioredis');
const shell = require('shelljs');
const Logger = require('./Logger');
const logger = Logger.instance;
const config = require('config');

class RedisService {
	static get instance() {
		if (!this._instance) {
			this._instance = new RedisService();
		}
		return this._instance;
	}

	constructor() {
		if (RedisService._instance) {
			return RedisService._instance;
		}

		this.redis = new Redis(config.get('redis'), { lazyConnect: true });
		this.redis.on('ready', () => {
			this.redis.config('SET', 'notify-keyspace-events', 'Ex');
		});
	}

	open() {
		this.redis.connect(() => {
			logger.info('ioredis OK');
		}).catch(() => {
			logger.error('error: missing redis');
			shell.exit(1);
		});
	}

	close() {
		logger.info('redis service closed');
		this.redis.quit();
	}
}

module.exports = RedisService;