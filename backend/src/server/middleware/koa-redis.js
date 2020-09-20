const RedisService = require('../../service/Redis');

module.exports = function() {
	return async (ctx, next) => {
		ctx.redis = RedisService.instance.redis;
		return next();
	};
};