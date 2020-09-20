import React, { Component } from 'react';
import { HashRouter as Router, Switch, Route } from 'react-router-dom';
import Cookies from 'js-cookie';
import Request from './Request';
import Debug from 'debug';
import Home from './Home';
import { FiLogOut } from "react-icons/fi";
import AppContext from './AppContext';
import './App.css';

const debug = Debug('app');

function App(props) {
	return (
		<div className="App">
			<div className="header">
				<p>Todolist 365</p>
				<div style={{ display: 'flex', alignItems: 'center' }}>
					{props.user &&
						<span>{props.user.name}</span>
					}
					<button onClick={e => {
						e.preventDefault();
						Cookies.remove('token');
						let url = `${AppContext.instance.service}/oauth/logout`;
						window.location = url;
					}}>
						<FiLogOut className='react-icons' style={{ fontSize: 20, verticalAlign: 'middle', color: '#fff' }} />
					</button>
				</div>
			</div>
			<Router>
				<Switch>
					<Route path="/about">
						<h1>/about</h1>
					</Route>
					<Route path="/">
						<Home user={props.user} />
					</Route>
				</Switch>
			</Router>
		</div>
	);
}

let hoc = (WrappedComponent) => {
	return class EnhancedComponent extends Component {
		constructor(props) {
			super(props);
			this.state = { loading: true, user: undefined };
		}

		async componentDidMount() {
			debug(AppContext.instance.service);
			this.clientId = AppContext.instance.clientId;
			let token = Cookies.get('token');
			if (!token) {
				let redirect_uri = encodeURIComponent(`${AppContext.instance.service}/oauth/callback/self?redirect=${encodeURIComponent(window.location)}`);
				let url = `${AppContext.instance.service}/oauth/authorize?response_type=token&client_id=${this.clientId}&redirect_uri=${redirect_uri}`;
				window.location = url;
			} else {
				Request.instance.token = token;
				let user = await Request.instance.user();
				debug(user);
				this.setState({ user });
				this.setState({ loading: false, token });
			}
		}

		render() {
			if (this.state.loading) {
				return <></>;
			} else {
				return <WrappedComponent user={this.state.user} />
			}
		}
	}
};

export default hoc(App);

