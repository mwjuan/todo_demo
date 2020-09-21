const Router = require('koa-router');
const auth = require('../middleware/koa-auth');
const router = new Router();
router.use(auth());

router.get('/users', async ctx => {
	let users = await ctx.model.User.find();
	ctx.body = users;
});

router.get('/user', async ctx => {
	ctx.body = ctx.state.user;
});

module.exports = router;
