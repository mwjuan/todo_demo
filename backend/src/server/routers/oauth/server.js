const _ = require('lodash');
const Router = require('koa-router');
const debug = require('debug')('app');
const mongoose = require('mongoose');
const moment = require('moment');
const config = require('config');
const { nanoid } = require('nanoid');
const User = mongoose.model('User');
const md5 = require('md5');
const router = new Router({ prefix: '/oauth' });

/**
 * 第三方网页程序从浏览器发起单点登录请求
 * 
 * - 支持response_type: code, token
 * - 如果cookie包含user则callback回redirectUri
 * - 否则给出登录页面
 * 
 * @api public
 */
router.get('/authorize', async ctx => {
	let { response_type, client_id, redirect_uri } = ctx.query;

	// STEP1: 参数检查
	if (!(response_type === 'code' || response_type === 'token')) {
		ctx.throw(400, 'Please specify `response_type`');
	}

	if (!redirect_uri) {
		ctx.throw(400, 'Please specify `redirect_uri`');
	}

	let userid = ctx.cookies.get('userid');

	// STEP2: cookie中没有发现userid, 登录页
	if (!userid) {
		let viewdata = { backend_origin: config.backend_origin, redirect_uri, response_type };
		await renderLoginPage(ctx, viewdata);
		return;
	}

	// STEP3: 根据userid确定user, 根据code/token指示进行跳转
	try {
		let user = await findUser(userid);
		let url = new URL(redirect_uri);

		if (response_type === 'code') {
			url.searchParams.set('code', await generateAuthorizationCode(ctx, user));
		}

		if (response_type === 'token') {
			url.searchParams.set('token', await generateToken(ctx, user));
		}

		ctx.redirect(url.href);
	} catch (error) {
		ctx.cookies.set('userid', '', { signed: false, maxAge: 0 })
		ctx.redirect(ctx.request.header.referer);
	}
});

/**
 * 处理登录页面提交内容
 * - username => 手机
 * - password => 手机验证码
 * @api public
 */
router.post('/authorize', async ctx => {
	let { response_type, username, password, redirect_uri, client_id } = ctx.request.body;

	// STEP1: 根据username, password确定user
	try {
		let user = await determineUser(username, password);
		ctx.cookies.set('userid', user.id, { expires: moment().add(1, 'year').toDate(), httpOnly: true });

		let url = new URL(redirect_uri);
		if (response_type === 'code') {
			url.searchParams.set('code', await generateAuthorizationCode(ctx, user));
		}

		if (response_type === 'token') {
			url.searchParams.set('token', await generateToken(ctx, user));
		}

		console.log('href===>>>', url.href)
		ctx.redirect(url.href);
	} catch (error) {
		let flash = { username, message: error.message }
		ctx.cookies.set('flash', new Buffer.from(JSON.stringify(flash)).toString('base64'));
		ctx.redirect(ctx.request.header.referer);
	}
});

/**
 * grant_type
 * - authorization_code
 * - password
 * - client_credentials
 * - refresh_token
 * - device
 * 
 * @api public
 */
router.post('/token', async ctx => {
	debug(ctx.request);
	let { grant_type } = ctx.request.body;

	if (grant_type === 'authorization_code') {
		let { code } = ctx.request.body;

		console.log('code==>>>', code);
		try {
			let user = await findUserByAuthorizationCode(ctx, code);
			let access_token = await generateToken(ctx, user);
			ctx.body = { access_token };
		} catch (error) {
			debug(error);
			ctx.throw(400, error.message);
		}
	} else if (grant_type === 'password') {
		let { username, password } = ctx.request.body;

		try {
			let user = await User.findOne({ mobile: username });
			debug(user);
			if (!user) throw new Error('user not found');
			if (user.password !== password) throw new Error('password not match');
			let access_token = await generateToken(ctx, user);
			ctx.body = { access_token };
		} catch (error) {
			ctx.throw(400, error.message);
		}
	} else if (grant_type === 'client_credentials') {

	} else {
		ctx.throw(400, 'Please specify `grant_type`');
	}
});

router.get('/logout', async ctx => {
	ctx.cookies.set('userid', '', { signed: false, maxAge: 0 });
	ctx.redirect(config.home_origin);
});

/**
 * @api private
 */
let renderLoginPage = async (ctx, viewdata) => {
	if (ctx.cookies.get('flash')) {
		let flash = JSON.parse(new Buffer.from(ctx.cookies.get('flash'), 'base64').toString());
		viewdata.username = flash.username;
		viewdata.message = flash.message;
		ctx.cookies.set('flash', null);
	}
	await ctx.render('login', viewdata);
};

/**
 * 创建code
 * - redis
 * - code:xxxxxx => userid
 * @api private
 */
let generateAuthorizationCode = async (ctx, user) => {
	let code = nanoid(8);
	await ctx.redis.set(`code:${code}`, user.id, 'EX', 300); // 5min
	return code;
};

/**
 * 创建token
 * - redis
 * - token:xxxxxx =>
 *   - user
 *   - device
 *   - app
 * @api private
 */
let generateToken = async (ctx, user) => {
	let token = nanoid(8);
	let data = { user: user.id };
	await ctx.redis.set(`token:${token}`, JSON.stringify(data), 'EX', 86400); //24h
	return token;
};

/**
 * @api private
 */
let findUser = async userid => {
	let result = await User.findById(userid);
	if (!result) throw new Error('user not found');
	return result;
};

/**
 * @api private
 */
let findUserByAuthorizationCode = async (ctx, code) => {
	let userid = await ctx.redis.get(`code:${code}`);
	await ctx.redis.get(`code:${code}`);
	let user = await User.findById(userid);
	if (!user) throw new Error('user not found');
	return user;
}

/**
 * @api private
 */
let determineUser = async (username, password) => {
	let user = await User.findOne({ mobile: username });

	if (!user) throw new Error('user not found');
	if (user.password !== md5(password)) throw new Error('user password error');
	return user;
};

module.exports = router;
