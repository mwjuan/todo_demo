/**
 * 单点登录——按OAuth2.0标准获取授权
 */
const Router = require('koa-router');
const _ = require('lodash');
const moment = require('moment');
const nanoid = require('nanoid');
const axios = require('axios');
const config = require('config');
const qs = require('qs');
const debug = require('debug')('app:oauth');
const md5 = require('md5');
const User = require('../../../model/User');
const AppContext = require('../../../AppContext');
const auth = require('../../middleware/koa-auth');

const router = new Router({ prefix: '/oauth' });

const {
	clientService,
} = AppContext.instance;

router.get('/authorize', async ctx => {
	//参数校验
	let { response_type, client_id, redirect_uri } = ctx.query;
	if (!(response_type === 'code' || response_type === 'token')) {
		ctx.throw(400, 'Please specify `response_type`');
	}

	let client = await getClient(ctx, client_id);
	if (!client) {
		ctx.throw(400, 'Please specify `client_id`');
	}

	if (!redirect_uri) {
		ctx.throw(400, 'Please specify `redirect_uri`');
	}

	let user = await getUserFromCookie(ctx);
	if (user) {
		try {
			await getAuthorization(ctx, client, user, redirect_uri);
		} catch (error) {
			await renderLoginPage(ctx, response_type, client, redirect_uri);
		}
	} else {
		await renderLoginPage(ctx, response_type, client, redirect_uri);
	}
});

router.post('/authorize', async ctx => {
	let { login_type, grant_type, username, password, redirect_uri, client_id } = ctx.request.body;
	let response_type = ctx.request.query.response_type;

	if (!login_type) {
		login_type = 'mail';
	}

	let client = await getClient(ctx, client_id);
	let user = null;
	let message = null;

	if (login_type === 'mail') {
		try {
			user = await userAuth(username, password);
			let data = JSON.stringify({ userid: user._id });
			ctx.cookies.set('data', data, { expires: moment().add(1, 'year').toDate(), httpOnly: true });
		} catch (err) {
			message = err.message;
		}
	}

	if (user) {
		try {
			await getAuthorization(ctx, client, user, redirect_uri);
		} catch (error) {
			message = error.message;
			await redirectBackToAuthorize(
				ctx,
				{ type: 'warning', message: message },
				{ client_id, redirect_uri, username, grant_type, response_type }
			);
		}

	} else {
		await redirectBackToAuthorize(
			ctx,
			{ type: 'warning', message: message },
			{ client_id, redirect_uri, username, grant_type, response_type }
		);
	}
});


/**
 * 获取token
 * 	 grant_type:
 * 		 - authorization_code
 * 		 - password
 *     - client_credentials
 *     - refresh_token
 */
router.post('/token', async ctx => {
	let { grant_type } = ctx.request.body;
	if (!grant_type ||
		!['authorization_code', 'password', 'client_credentials'].includes(grant_type)) {
		ctx.throw(400, 'Please specify `grant_type`');
	}

	switch (grant_type) {
		case 'authorization_code':
			return await getTokenByAuthorizationCode(ctx);
	}
});

//通过token获取相关信息
router.get('/tokeninfo', async ctx => {
	let token = ctx.query.token;
	let client = null;
	let user = null;
	let result = {};

	if (!token) {
		ctx.throw(400, 'Please specify `token`');
	}

	let exists = await ctx.redis.exists(`token:${token}`);
	if (!exists) {
		ctx.throw(400, 'Please specify `token`');
	}
	result.token = token;

	let p = await getTokenDataFromRedis(ctx, token);
	// must client_id
	client = await clientService.findByCode(p.client_id);
	if (!client) {
		ctx.throw(400, 'The client of token is not exist now');
	}
	result.client = {
		code: client.code,
		name: client.name
	};

	if (p.user) {
		user = await User.findOne({ _id: p.user });
		if (!user) {
			ctx.throw(400, 'The user is not exist now');
		}
		if (!user.enabled) {
			ctx.throw(400, 'The user is disabled');
		}
		result.user = {
			name: user.name,
			email: user.email
		};
	}

	ctx.body = result;
	ctx.status = 200;
});

router.get('/logout', auth(), async ctx => {
	let token = ctx.state.token;
	await ctx.redis.del(`token:${token}`);
	ctx.cookies.set('data', null, { maxAge: 0, httpOnly: true });
	ctx.status = 200;
	ctx.redirect(config.get('home_origin'));
	await actionLogService.info('logout', 'oauth', '', ctx);
});

let getTokenByAuthorizationCode = async (ctx) => {
	let { code, client_id, client_secret } = ctx.request.body;

	let client = await getClient(ctx, client_id);
	if (client.secret !== client_secret) {
		ctx.throw(400, 'The client_id and client_secret does not match.');
	}

	if (code) {
		let exists = await ctx.redis.exists(`code:${code}`);
		if (exists) {
			let userid = await ctx.redis.get(`code:${code}`);
			if (userid) {
				let token = await generateTokenIntoRedis(ctx, null, client.code, userid);
				ctx.body = { access_token: token };
			} else {
				ctx.throw(500, 'missing code binding data');
			}
		} else {
			ctx.throw(400, 'Please specify `code`, maybe expired');
		}
	} else {
		ctx.throw(400, 'Please specify `code`');
	}
};

//获取授权
let getAuthorization = async (ctx, client, user, redirect_uri) => {
	let { response_type } = ctx.query;

	console.log('response-type===>>>', response_type);
	console.log('user===>>>', user);

	if (response_type === 'token') {
		let url = new URL(redirect_uri);
		let token = await generateTokenIntoRedis(ctx, null, client.code, user._id);

		url.searchParams.set('token', token);
		debug(url.href);
		ctx.redirect(url.href);
	}

	if (response_type === 'code') {
		let code = await generateAuthorizationCode(ctx, user);

		if (redirect_uri) {
			let url = new URL(redirect_uri);
			url.searchParams.set('client_id', client.code);
			url.searchParams.set('code', code);
			debug('redirect', url.href);
			ctx.redirect(url.href);
		} else {
			let baseUrl = config.get('backend_origin');
			let url = `${baseUrl}/oauth/callback/self?client_id=${client.code}&code=${code}`;
			ctx.redirect(url);
		}
	}
};

//生成授权码
let generateAuthorizationCode = async (ctx, user) => {
	let code = nanoid(8);
	await ctx.redis.set(`code:${code}`, user.id, 'EX', 300);
	return code;
};

//生成token并存储到Redis中
let generateTokenIntoRedis = async (ctx, token, clientCode, userId, deviceId) => {
	if (!token) token = nanoid(8);

	let tokenData = {
		client_id: clientCode,
		user: userId
	};

	await ctx.redis.set(`token:${token}`, JSON.stringify(tokenData), 'EX', 86400);
	return token;
};

//重定向回authorize url
let redirectBackToAuthorize = async (ctx, flash, args) => {
	ctx.cookies.set('flash', new Buffer.from(JSON.stringify(flash)).toString('base64'));
	let q = qs.stringify(args);
	debug('qs', q);
	let url = `/oauth/authorize?${q}`;
	debug('redirect back:', url);
	ctx.redirect(url);
};

//重新登录
let renderLoginPage = async (ctx, response_type, client, redirect_uri) => {
	let username = ctx.query.username;

	let flash = null;
	if (ctx.cookies.get('flash')) {
		flash = JSON.parse(new Buffer.from(ctx.cookies.get('flash'), 'base64').toString());
		ctx.cookies.set('flash', null);
	}

	// 未登录, 显示登录页面
	let clientId = client.code;
	let backend_origin = config.get('backend_origin');
	let viewdata = { backend_origin, redirect_uri, clientId, username, flash, response_type };

	await ctx.render('login', viewdata);
};

//获取client
let getClient = async (ctx, clientId) => {
	let client = null;

	try {
		client = await clientService.findByCode(clientId);
	} catch (error) {
		debug(error.message);
	} finally {
		if (!client) {
			ctx.throw(400, 'Please specify `client_id`');
		}
	}
	return client;
};

//获取cookie中的用户信息
let getUserFromCookie = async (ctx) => {
	let user = null;
	try {
		let data = ctx.cookies.get('data');
		if (data) {
			data = JSON.parse(data);
			user = await User.findOne({ _id: data.userid });
		}
	} catch (error) {
		debug(error);
	}

	return user;
};

//通过token从Redis中获取相关数据
let getTokenDataFromRedis = async (ctx, token) => {
	if (!token) return null;
	let json = await ctx.redis.get(`token:${token}`);
	return JSON.parse(json);
};

let userAuth = async (email, password) => {
	email = _.trim(email);
	password = _.trim(password);
	if (!email || !password) {
		throw Error('email or password is empty');
	}

	//邮箱转小写
	email = email.toLocaleLowerCase();
	let users = await User.find({ email });
	console
	if (users.length <= 0) {
		throw Error(`email:${email} not found`);
	}

	let loginUser = null;

	for (let user of users) {
		if (user.password === md5(password)) {
			loginUser = user;
		}
	}

	if (!loginUser) {
		throw Error(`password wrong! ${password}`);
	}
	return loginUser;
}

module.exports = router;