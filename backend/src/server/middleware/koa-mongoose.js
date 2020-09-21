const mongoose = require('mongoose');

let model = {};
const modelProxy = new Proxy(model, {
  get: function(target, prop) {
		return mongoose.model(prop);
  }
})

module.exports = function() {
	return async (ctx, next) => {
		ctx.model = modelProxy;
		return next();
	};
};
