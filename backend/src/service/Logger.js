const { createLogger, format, transports } = require('winston');
const { errors, combine, timestamp, label, colorize, simple, json, printf } = format;
const chalk = require("chalk");
const debug = require('debug')('app');
const config = require('config');
require('winston-daily-rotate-file');

const moment = require('moment');
const strip = require('strip-color');

const app = format((info, opts) => {
	if (opts.app) {
		info.app = opts.app;
	}
	return info;
});

const create = tag => {
	let logger = createLogger();

	if (config.logger.file) {
		logger.add(
			new transports.DailyRotateFile({
				level: config.logger.level,
				json: true,
				dirname: `/var/log/todolist365`,
				filename: `${tag}-%DATE%.log`,
				datePattern: 'YYYY-MM-DD-HH',
				zippedArchive: false,
				maxSize: '20m',
				maxFiles: '7d',
				handleExceptions: true,
				format: combine(
					errors({ stack: true }),
					timestamp(),
					app({ app: 'todolist365' }),
					json()
				)
			})
		);
	}

	if (config.logger.console) {
		logger.add(
			new transports.Console({
				level: config.logger.level,
				handleExceptions: true,
				json: false,
				format: combine(
					colorize(),
					errors({ stack: true }),
					simple(),
					printf(info => {
						let level = info.level;
						switch (level) {
							case "info":
								level = chalk.cyan(level);
								break;
							case "warn":
								level = chalk.yellow(level);
								break;
							case "error":
								level = chalk.red(level);
								break;
							default:
								break;
						}

						return `${level}: ${info.message}`;
					})
				)
			})
		);
	}

	return logger;
}

exports.logger = create('app');
exports.accessLogger = create('access');