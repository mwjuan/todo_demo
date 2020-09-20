const _ = require('lodash');
const debug = require('debug')('app:auth');
const mongoose = require('mongoose');
const User = mongoose.model('User');

let auth = function () {
	return async (ctx, next) => {
		try {
			// STEP1: 获取token
			let token = await getToken(ctx);

			// STEP2: 验证token
			let user = await User.findById(token.user);
			if (!user) throw new Error();
			ctx.state.user = user;

			return next();
		} catch (error) {
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

	if (!(await ctx.redis.exists(`token:${token}`))) throw new Error();

	let data = await ctx.redis.get(`token:${token}`);
	let tag = JSON.parse(data);
	if (!tag) throw new Error();
	if (!tag.user) throw new Error();
	return tag;
};

module.exports = auth;