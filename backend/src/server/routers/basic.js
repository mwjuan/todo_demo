const _ = require('lodash');
const Router = require('koa-router');
const moment = require('moment');
const config = require('config');
const ip = require('ip');

const router = new Router();

router.get('/', async ctx => {
	ctx.body = {
		pid: process.pid,
		service: config.get('app'),
		env: process.env.NODE_ENV,
		timestamp: moment().format('LLLL'),
		ip: ip.address(),
		logs: '/logs'
	};
});

module.exports = router;
