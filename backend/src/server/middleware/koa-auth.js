const _ = require('lodash');
const debug = require('debug')('app:auth');
const { logger } = require('../../service/logger');
const jwt = require('jsonwebtoken');
const config = require('config');
const moment = require('moment');

let auth = function () {
	return async (ctx, next) => {
		try {
			let token = await getToken(ctx);

			let decoded = jwt.verify(token, config.security.jwtSecret);
			if (!(decoded.exp || decoded.exp > moment().unix())) {
				throw Error('exp');
			}

			if (decoded.user) {
				let user = await ctx.model.User.findOne({ email: decoded.user.email });
				if (!user) throw new Error();
				ctx.state.user = user;
			}

			return next();
		} catch (error) {
			debug(error);
			ctx.throw(401, error.message ? error.message : '');
		}
	};
};

let getToken = async ctx => {
	let token = undefined;

	if (ctx.query.token) {
		token = ctx.query.token;
	} else if (ctx.header.authorization) {
		token = ctx.header.authorization.split(' ').slice(1)[0];
	}

	if (!token) throw new Error();
	return token;
};

module.exports = auth;