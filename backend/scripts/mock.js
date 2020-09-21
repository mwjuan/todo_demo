// NODE_ENV
if (!process.env.NODE_ENV) {
	process.env.NODE_ENV = 'development';
}
require('dotenv').config();
const md5 = require('md5');
const debug = require('debug')('app:mock');
const config = require('config');
const User = require('../src/model/User');
const mongoose = require('mongoose');

let mockUsers = async () => {
	await User.create({
		name: '曹晖',
		password: md5('P@ssw0rd'),
		email: 'caohui@shgbit.com'
	});

	await User.create({
		name: '封昌俊',
		password: md5('P@ssw0rd'),
		email: 'fengchangjun@shgbit.com'
	});

	await User.create({
		name: '马文娟',
		password: md5('P@ssw0rd'),
		email: 'mawenjuan@shgbit.com'
	});
};

let app = async () => {
	try {
		debug(`[${process.env.NODE_ENV}] ${config.get('db')}`);

		await mongoose.connect(config.get('db'));
		await mockUsers();

		debug('done');
	} catch (error) {
		debug(error);
	} finally {
		process.exit(0);
	}
};

app();
