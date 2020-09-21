const config = require('config');
const Redis = require('ioredis');
const redis = new Redis(config.redis, { lazyConnect: true });

module.exports = function () {
	return async (ctx, next) => {
		ctx.redis = redis;
		return next();
	};
};