const Router = require('koa-router');
const config = require('config');
const debug = require('debug')('app');
const moment = require('moment');
const md5 = require('md5');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const { logger } = require('../../service/Logger');

const router = new Router({ prefix: '/api/oauth' });
/**
 * 第三方网页程序从浏览器发起单点登录请求
 * 
 * - 支持response_type: code, token
 * - 如果cookie包含user则callback回redirectUri
 * - 否则给出登录页面
 * 
 * code和token的区别: code适用于跨域登录, token适用于同域, 直接给页面注入cookie, 这里token和标准implict方式有些区别,标准implict采用#token=xxx
 * 
 * @api public
 */
router.get('/authorize', async ctx => {
	let { response_type, redirect_uri } = ctx.query;
	debug(ctx.query)
	// STEP1: 参数检查
	if (!(response_type === 'code' || response_type === 'token')) { ctx.throw(400, 'Please specify `response_type`'); }
	if (!redirect_uri) { ctx.throw(400, 'Please specify `redirect_uri`'); }

	let token = ctx.cookies.get('token');

	// STEP2: cookie中没有发现token, 登录页
	if (!token) {
		let viewdata = { redirect_uri, response_type };
		await renderLoginPage(ctx, viewdata);
		return;
	}

	// STEP3: 根据jwt确定user, 根据code/token指示进行跳转
	try {
		let url = new URL(redirect_uri);
		if (response_type === 'code') {
			url.searchParams.set('code', await generateAuthorizationCode(ctx, ctx.user));
		}

		ctx.redirect(url.href);
	} catch (error) {
		debug(error.stack);
		ctx.cookies.set('token', '', { maxAge: 0 });
		ctx.redirect(ctx.request.header.referer);
	}
});

router.post('/authorize', async ctx => {
	let { response_type, email, password, redirect_uri } = ctx.request.body;

	// STEP1: 根据username, password确定user
	try {
		/**
		 * email and password
		 */
		let user = await ctx.model.User.findOne({ email, password: md5(password) });
		debug(user);
		if (!user) throw new Error('user not found or password not match');

		let url = new URL(redirect_uri);
		if (response_type === 'code') {
			let payload = { user: { email: user.email } };
			let code = jwt.sign(payload, config.security.jwtSecret, { expiresIn: '1h' });
			logger.info(`oauth code: generate jwt for user - ${user.email}`);
			url.searchParams.set('code', code);
		}

		if (response_type === 'token') {
			let payload = { user: { email: user.email } };

			let access_token = jwt.sign(payload, config.security.jwtSecret, { expiresIn: '30d' });

			logger.info(`oauth token: generate jwt for user - ${user.email}`);
			ctx.cookies.set('token', access_token, { httpOnly: false, expires: moment().add(30, 'day').toDate() });
			ctx.redis.set('token', access_token, 'EX', 3600 * 24 * 30)
		}

		ctx.redirect(url.href);
	} catch (error) {
		let flash = { email, message: error.message }
		ctx.cookies.set('flash', new Buffer.from(JSON.stringify(flash)).toString('base64'));
		ctx.redirect(ctx.request.header.referer);
	}
})

router.get('/logout', async ctx => {
	ctx.cookies.set('token', null, { maxAge: 0, httpOnly: false });
	ctx.redis.del('token')

	ctx.redirect('/');
});

/**
 * @api private
 */
let renderLoginPage = async (ctx, viewdata) => {
	if (ctx.cookies.get('flash')) {
		let flash = JSON.parse(new Buffer.from(ctx.cookies.get('flash'), 'base64').toString());
		viewdata.email = flash.email;
		viewdata.message = flash.message;
		ctx.cookies.set('flash', null);
	}

	await ctx.render('login', viewdata);
};

//生成授权码
let generateAuthorizationCode = async (ctx, user) => {
	let code = nanoid(8);
	await ctx.redis.set(`code:${code}`, user, 'EX', 300);
	return code;
};

module.exports = router;