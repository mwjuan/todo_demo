const _ = require('lodash');

class OAuthClientService {
	constructor() {
		this.clients = [];
		this.clients.push({
			code: 'todo-webapp',
			secret: 'd0dbacc9-c8ac-42ae-bc9d-266a65329cb2',
			callback: {
				desktop: null,
				mobile: null
			}
		});
	}

	findByCode(code) {
		return _.find(this.clients, x => x.code === code);
	}
}

module.exports = OAuthClientService;