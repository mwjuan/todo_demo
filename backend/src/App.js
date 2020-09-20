const WebServer = require('./server/WebServer');
const AppContext = require('./AppContext');
const config = require('config');

const {
	mongodb,
	redisService
} = AppContext.instance;

/** 
 * 整个程序的组织者
 */
class App {
	constructor() {
		this.webServer = new WebServer();
		AppContext.instance.webServer = new WebServer();
	}

	/**
	 * 程序启动
	 * 1. 打开mongodb
	 * 2. 打开redis
	 * 3. 打开web server
	 */
	async open() {
		await mongodb.open(config.get('db'));
		await redisService.open();
		await this.webServer.open();
	}

	/**
	 * 程序结束
	 * 1. 关闭web server
	 * 2. 关闭redis
	 * 3. 关闭mongodb
	 */
	async close() {
		await this.webServer.close();
		await redisService.close();
		await mongodb.close();
	}
}

module.exports = App;
