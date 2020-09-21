const Router = require('koa-router');
const auth = require('../middleware/koa-auth');
const router = new Router({ prefix: '/api' });
router.use(auth());

router.get('/users', async ctx => {
	let users = await ctx.model.User.find();
	ctx.body = users;
});

router.get('/me', async ctx => {
	if (ctx.state.user) {
		ctx.body = ctx.state.user;
	} else {
		ctx.body = 'hello';
	}
});

module.exports = router;
