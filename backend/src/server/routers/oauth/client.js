const Router = require('koa-router');
const axios = require('axios');
const _ = require('lodash');
const debug = require('debug')('app:client');
const moment = require('moment');
const AppContext = require('../../../AppContext');
const { config } = require('winston');

const router = new Router({ prefix: '/oauth/callback' });

const {
	clientService,
} = AppContext.instance;

router.get('/self', async ctx => {
	let { code, redirect, client_id } = ctx.request.query;
	if (!code) { ctx.throw(400, 'Please specify `code`'); }
	if (!client_id) { ctx.throw(400, 'Please specify `client_id`'); }

	let client = await clientService.findByCode(client_id);
	if (!client) { ctx.throw(400, 'Please specify `client_id`'); }

	let token = null,
		params = {
			grant_type: 'authorization_code',
			code: code,
			client_id: client.code,
			client_secret: client.secret
		};

	try {
		let tokenResponse = await axios.post(`${config.get('backend_origin')}/oauth/token`, params);
		token = tokenResponse.data.access_token;
	} catch (error) {
		ctx.throw(400, `[POST]${baseUrl}/oauth/token => get token failed:${error.message}`);
	}


	let _url = null;
	if (redirect) _url = redirect;
	else if (ctx.userAgent.isMobile && client.callback && client.callback.mobile) _url = client.callback.mobile;
	else if (!ctx.userAgent.isMobile && client.callback && client.callback.desktop) _url = client.callback.desktop;

	if (!_url) {
		ctx.status = 200;
		return;
	}

	let url = new URL(_url);
	ctx.cookies.set('token', token, { expires: moment().add(24, 'hours').toDate(), httpOnly: false });
	debug('redirect', url.href);
	ctx.redirect(url.href);
});

module.exports = router;