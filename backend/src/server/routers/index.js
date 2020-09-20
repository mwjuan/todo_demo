const compose = require('koa-compose');
const _ = require('lodash');

let mods = [
	require('./basic'),
	require('./oauth/server'),
	require('./oauth/client'),
	require('./users'),
];

let routers = [];
_.each(mods, x => {
	routers.push(x.routes());
	routers.push(x.allowedMethods());
});

module.exports = compose(routers);
