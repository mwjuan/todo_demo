const _ = require('lodash');
const combineRouters = require('koa-combine-routers');
const oauthServer = require('./oauth');
const users = require('./users');
const basic = require('./basic');

let routers = [oauthServer, users, basic];

let entries = [];

_.each(routers, router => {
	_.each(router.stack, s => {
		_.each(s.methods, m => {
			if (['GET', 'POST', 'PUT', 'DELETE'].includes(m.toUpperCase())) {
				entries.push(`${m} ${s.path}`);
			}
		})
	});
});

exports.entries = entries;
exports.routers = combineRouters(...routers);