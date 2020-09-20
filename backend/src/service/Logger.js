const config = require('config');
const moment = require('moment');
const path = require('path');
const stackTrace = require('stack-trace');
const strip = require('strip-color');
const chalk = require('chalk');
const { createLogger, format, transports } = require('winston');
require('winston-daily-rotate-file');

/**
 * 日志服务
 */
class Logger {
	static get instance() {
		if (!this._instance) {
			this._instance = new Logger();
		}
		return this._instance;
	}

	constructor() {
		this.name = 'space365-logger';
		this.init();
	}

	/**
	 * 获取child logger
	 * @param {Object} options
	 * @return child logger
	 */
	child(options) {
		let result = {};
		result.logger = this.logger.child(options);

		result.log = (level, msg, ...splat) => {
			let args = [level];

			if (msg && typeof msg === 'object') {
				if (typeof msg.message !== 'undefined') {
					args.push('');
				}
			}
			args.push(msg);
			return result.logger.log(...args, ...splat, this.getCallerInfo());
		};

		Object.keys(this.logger.levels).forEach(level => {
			if (level !== 'log') {
				result[level] = (...args) => {
					return result.log(level, ...args);
				};
			}
		});

		return result;
	}

	log(level, msg, ...splat) {
		let args = [level];

		if (msg && typeof msg === 'object') {
			if (typeof msg.message !== 'undefined') {
				args.push('');
			}
		}
		args.push(msg);

		return this.logger.log(...args, ...splat, this.getCallerInfo());
	}

	getCallerInfo() {
		let level = stackTrace.get().length;
		let frame;
		for (let i = 0; i < level; ++i) {
			let current = stackTrace.get()[i];
			if (__filename !== current.getFileName()) {
				frame = current;
				break;
			}
		}

		if (frame) {
			let filename = frame.getFileName();
			if (filename && require.main.filename) {
				let base = path.dirname(require.main.filename);
				filename = filename.replace(base, '').slice(1);
				let line = frame.getLineNumber();
				return { filename, line };
			}
		}

		return null;
	}

	init() {
		this.logger = createLogger({
			level: 'debug',
			format: format.combine(
				format.errors({ stack: true }),
				format.splat(),
				format.prettyPrint(),
				format.timestamp({ format: () => moment().unix() }),
				format.label(`[${config.get('app')}]`),
				format.errors({ stack: true })
			),
			transports: [
				new (transports.DailyRotateFile)({
					level: 'debug',
					json: true,
					filename: 'logs/app-%DATE%.log',
					datePattern: 'YYYY-MM-DD-HH',
					zippedArchive: false,
					maxSize: '20m',
					maxFiles: '14d',
					format: format.combine(
						format(info => {
							// console.dir(info.message);
							info.message = strip(info.message);
							return info;
						})(),
						format.json()
					)
				})
			]
		});

		if (config.get('logger.console')) {
			// if (['development', 'test'].includes(process.env.NODE_ENV)) {
			this.logger.add(new transports.Console({
				level: 'debug',
				format: format.combine(
					format.colorize(),
					format.printf(info => {
						let content;
						if (info.filename && info.line) {
							content = (info.requestId ? `[req_id: ${info.requestId}]` : '') + `${moment.unix(info.timestamp).format('HH:mm')} ${info.level} [${info.filename}:${info.line}]: ${info.message}`;
						} else {
							content = (info.requestId ? `[req_id: ${info.requestId}]` : '') + `${moment.unix(info.timestamp).format('HH:mm')} ${info.level}: ${info.message}`;
						}

						if (info.packet) {
							content = content + '\n  ' + chalk.gray(JSON.stringify(info.packet));
						}

						if (info.stack) {
							let base = path.dirname(path.dirname(require.main.filename)) + '/';
							content += '\n' + info.stack.split(base).join('');
						}
						return content;
					})
				)
			}));
		}

		// 按上debug, info, warn, error handler
		Object.keys(this.logger.levels).forEach(level => {
			if (level !== 'log') {
				this[level] = (...args) => {
					return this.log(level, ...args);
				};
			}
		});
	}

	async query() {
		const options = {
			from: moment().subtract(1, 'hours').unix(),
			until: moment().unix(),
			limit: 10000,
			start: 0,
		};

		return new Promise((resolve, reject) => {
			this.logger.query(options, function (err, results) {
				if (err) {
					reject();
				}
				resolve(results.dailyRotateFile);
			});
		});
	}
}

module.exports = Logger;