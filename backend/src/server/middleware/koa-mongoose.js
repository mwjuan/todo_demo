const mongoose = require('mongoose');

module.exports = function() {
	return async (ctx, next) => {
		ctx.model = name => mongoose.model(name);
		return next();
	};
};