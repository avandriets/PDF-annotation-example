var path = require('path');
var webpack = require('webpack');

const CopyWebpackPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development',
    entry: ['babel-polyfill', './src/main.js'],
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.js'
    },
    plugins: [
        new CopyWebpackPlugin([
            {
                from: path.resolve(__dirname, './src/assets'),
                to: './',
                ignore: ['.*']
            }
        ]),
        new HtmlWebpackPlugin({
            filename: 'index.html',
            template: './src/index.html',
            inject: true
        }),
    ]
};
