import React, { Component } from 'react';
import Cookies from 'js-cookie';
import request from './request';
import Debug from 'debug';
import { FiLogOut } from "react-icons/fi";

const debug = Debug('app');

function App(props) {
	return (
		<div className="App">
			<div className="header">
				<div style={{ display: 'flex', alignItems: 'center', paddingLeft: 20 }}>
					{props.user &&
						<h1>Hello，{props.user.name}</h1>
					}
					<button
						style={{ marginLeft: 10 }}
						onClick={e => {
							e.preventDefault();
							Cookies.remove('token');
							let url = '/api/oauth/logout';
							window.location = url;
						}}>
						<FiLogOut className='react-icons' style={{ fontSize: 20, verticalAlign: 'middle' }} />
					</button>
				</div>
			</div>
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
			let token = Cookies.get('token');

			if (!token) {
				let redirect_uri = `${encodeURIComponent(window.location)}`;
				let url = `${window.location.origin}/api/oauth/authorize?response_type=token&redirect_uri=${redirect_uri}`;
				window.location.href = url;
			} else {
				request.token = token;

				let user = await request.user();
				debug(user);
				this.setState({ loading: false, user });
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

