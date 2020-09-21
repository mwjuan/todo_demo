const _ = require('lodash');
const config = require('config');
const { logger } = require('../service/logger');
const debug = require('debug')('app');
const path = require('path');
const Koa = require('koa');
const koaStatic = require('koa-static');
const koaViews = require('koa-views');
const cors = require('@koa/cors');
const koaJson = require('koa-json');
const koaBodyParser = require('koa-bodyparser');
const { userAgent } = require('koa-useragent');
const koaLogger = require('./middleware/koa-logger');
const koaMongoose = require('./middleware/koa-mongoose');
const { entries, routers } = require('./routers');

class WebServer {
	constructor() {
		this.entries = entries;
		this.koa = this.build();
	}

	build() {
		let koa = new Koa();
		koa.proxy = true;
		koa.use(cors())
			.use(userAgent)
			.use(koaLogger(logger))
			.use(koaJson())
			.use(koaBodyParser())
			.use(koaMongoose())
			.use(koaStatic(path.join(__dirname, 'public')))
			.use(koaViews(path.join(__dirname, 'views'), { extension: 'hbs', map: { hbs: 'handlebars' } }))
			.use(routers())

		return koa;
	}

	async open() {
		return new Promise((resolve, reject) => {
			this.server = this.koa.listen(config.get('port'), '0.0.0.0', () => {
				logger.info(`web server started, please visit: http://0.0.0.0:${config.port} (with ${process.env.NODE_ENV} mode)`);
				resolve(this.server);
			});
		});
	}

	async close() {
		await this.server.close();
		logger.info('web server closed.');
	}
}

module.exports = WebServer;