import Debug from 'debug';

const debug = Debug('app:context');

class AppContext {
	static get instance() {
		if (!this._instance) {
			this._instance = new AppContext();
		}
		return this._instance;
	}

	constructor() {
		if (AppContext._instance) {
			return AppContext._instance;
		}

		this.init();
	}

	noop() {
		debug(this.clientId);
		debug(this.service);
		debug(this.homepage);
	}

	init() {
		let url = new URL(window.location.href);
		let originValue = `${url.origin}/api`;
		this.service = originValue;

		this.clientId = 'todo-webapp';
		this.homepage = url.origin;
	}
}

export default AppContext;