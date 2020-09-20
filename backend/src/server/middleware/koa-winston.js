const chalk = require('chalk');
const debug = require('debug')('app');

module.exports = (logger) => {
	return async function (ctx, next) {
		let child = logger.child({ requestId: ctx.state.id });

		ctx.logger = child;

		ctx.logger.info(`${chalk.gray('<--')} ${chalk.bold(ctx.method)} ${chalk.gray(ctx.originalUrl)}`);

		await next();

		ctx.logger.info(`${chalk.gray('-->')} ${chalk.bold(ctx.method)} ${chalk.gray(ctx.originalUrl)} ${chalk.bold(ctx.status)}`);
	};
};