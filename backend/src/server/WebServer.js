const _ = require('lodash');
const moment = require('moment');
const path = require('path');
const config = require('config');
const Koa = require('koa');
const koaStatic = require('koa-static');
const koaJson = require('koa-json');
const koaBodyParser = require('koa-bodyparser');
const { userAgent } = require('koa-useragent');
const cors = require('@koa/cors');
const koaViews = require('koa-views');
const koaRedis = require('./middleware/koa-redis');
const koaMongoose = require('./middleware/koa-mongoose');
const router = require('./routers');
const koaWinston = require('./middleware/koa-winston');
const AppContext = require('../AppContext');

const { logger } = AppContext.instance;

class WebServer {
	constructor() {
		this.koa = this.build();
	}

	build() {
		let koa = new Koa();
		koa.use(cors());
		koa.use(koaWinston(logger));
		koa.use(koaViews(path.join(__dirname, 'views'), { extension: 'hbs', map: { hbs: 'handlebars' } }));
		koa.use(koaStatic(path.join(__dirname, 'public')));
		koa.use(koaJson());
		koa.use(koaBodyParser());
		koa.use(koaRedis());
		koa.use(koaMongoose());
		koa.use(userAgent);
		koa.use(router);
		koa.on('error', (err, ctx) => {
			ctx.logger.error(err);
		});
		return koa;
	}

	async open() {
		return new Promise((resolve, reject) => {
			this.server = this.koa.listen(config.get('port'), () => {
				logger.info(`ver: ${AppContext.instance.version}, ${moment().format()}`);
				logger.info(`Server started, please visit: http://:${config.port} (with ${process.env.NODE_ENV} mode)`);

				resolve();
			});
		});
	}

	async close() {
		logger.info('webserver closed');
		await this.server.close();
	}
}

module.exports = WebServer;