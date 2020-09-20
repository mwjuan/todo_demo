const mongoose = require('mongoose');
const Logger = require('./Logger');
const logger = Logger.instance;
const mongoosePaginate = require('mongoose-paginate-v2');

class Mongodb {
	static get instance() {
		if (!this._instance) {
			this._instance = new Mongodb();
		}
		return this._instance;
	}

	constructor() {
		if (Mongodb._instance) {
			return Mongodb._instance;
		}

		this.init();
	}

	init() {
		this.mongoose = mongoose;

		this.mongoose.connection.on('connected', () => {
			logger.info('Mongoose connection open to: %s', this.conn);
		});

		this.mongoose.connection.on('error', err => {
			logger.error('Mongoose connection error: %s', err);
			logger.error(err);
		});

		this.mongoose.connection.on('disconnected', () => {
			logger.info('Mongoose connection disconnected');
		});

		this.options = {
			useNewUrlParser: true,
			useFindAndModify: false,
			useCreateIndex: true,
			useUnifiedTopology: true
		};

		mongoosePaginate.paginate.options = {
			customLabels: {
				totalDocs: 'total',
				docs: 'items',
				limit: 'size',
				nextPage: 'next',
				prevPage: 'prev',
				totalPages: 'pages',
				hasPrevPage: 'hasPrev',
				hasNextPage: 'hasNext'
			}
		};
	}

	open(conn) {
		return this.connect(conn);
	}

	connect(conn) {
		this.conn = conn;
		return this.mongoose.connect(this.conn, this.options);
	}

	close() {
		return this.mongoose.connection.close();
	}

	drop() {
		return this.mongoose.connection.dropDatabase();
	}
}

module.exports = Mongodb;