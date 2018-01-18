module.exports = {
	entry: {
		main: "./index",
		misc: "./second",
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		splitChunks: {
			includeInitialChunks: true,
			minSize: 1
		}
	}
};
