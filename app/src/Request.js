import axios from 'axios';
import _ from 'lodash';
import Debug from 'debug';
import Cookies from 'js-cookie';
import AppContext from './AppContext';
const debug = Debug('app:request');

export default class Request {
	set token(value) {
		this._token = value;
		this._client = axios.create();
		this._client.interceptors.request.use(cfg => {
			cfg.baseURL = AppContext.instance.service;

			if (this._token) {
				cfg.headers = _.assign(cfg.headers, { Authorization: `Bearer ${this._token}` });
			}
			return cfg;
		});

		this._client.interceptors.response.use(response => response, error => {
			debug(error);
			if (error.response && error.response.status === 401) {
				Cookies.remove('token');
				window.location = AppContext.instance.homepage;
			}
			return Promise.reject(error);
		});
	}

	get token() {
		return this._token;
	}

	static get instance() {
		if (!this._instance) {
			this._instance = new Request();
		}
		return this._instance;
	}

	constructor() {
		if (Request._instance) {
			return Request._instance;
		}
	}

	async user() {
		let response = await this._client.get('/user');
		this._user = response.data;
		return response.data;
	}

	async getUsers() {
		let response = await this._client.get(`users`);
		return response.data;
	}
}