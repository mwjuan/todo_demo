const AppContext = require('./AppContext');
const { logger } = AppContext.instance;

require('./model');

const App = require('./App');
let app = new App();

let main = async () => {
	await app.open();
};

let cleanup = () => {
	app.close();
	process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

main().then(() => {

}).catch(err => {
	logger.error(err);
});