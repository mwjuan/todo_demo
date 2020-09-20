const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const _externals = require('externals-dependencies');

let externals = _externals();

module.exports = {
	mode: 'production',
	target: 'node',
	entry: './src/index.js',
	node: {
		__filename: false,
		__dirname: false
	},
	output: {
		path: path.join(__dirname, 'dist', process.env.NODE_ENV),
		filename: 'bundle.js'
	},
	optimization: {
		minimizer: [new TerserPlugin()]
	},
	plugins: [
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
			'process.env.DEBUG': JSON.stringify(process.env.DEBUG)
		}),
		new CopyWebpackPlugin({
			patterns: [
				{ from: 'package.json' },
				{ from: 'ecosystem.config.js' },
				{ from: './src/server/public', to: 'public' },
				{ from: './src/server/views', to: 'views' },
				{ from: 'config', to: 'config' },
			]
		}),
	],
	externals
};