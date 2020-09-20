const _ = require('lodash');
const Router = require('koa-router');
const debug = require('debug')('app');
const config = require('config');
const axios = require('axios');

const router = new Router({ prefix: '/oauth/callback' });

router.get('/self', async ctx => {
	try {
		let params = {
			grant_type: 'authorization_code',
			token: ctx.query.token
		};

		tokenResponse = await axios.post(`${config.backend_origin}/oauth/token`, params);
		ctx.cookies.set('token', tokenResponse.data.access_token, { httpOnly: false });
		ctx.redirect(ctx.query.redirect);
	} catch (error) {
		ctx.throw(400, error.message);
	}
});

module.exports = router;
