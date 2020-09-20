const Router = require('koa-router');
const mongoose = require('mongoose');
const User = mongoose.model('User');

const router = new Router({ prefix: '/users' });

router.get('/', async ctx => {
	let users = await User.find();
	ctx.body = users;
});

module.exports = router;
