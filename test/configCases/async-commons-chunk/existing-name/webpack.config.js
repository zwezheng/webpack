var webpack = require("../../../../");

module.exports = {
	performance: {
		hints: false
	},
	optimization: {
		asyncCommonsChunks: {
			minSize: 1,
			name: true
		}
	},
	plugins: [
		new webpack.NamedChunksPlugin()
	]
};
