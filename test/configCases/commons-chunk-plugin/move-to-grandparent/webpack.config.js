module.exports = {
	entry: {
		main: "./index",
		misc: "./second",
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		asyncCommonsChunks: {
			minSize: 1
		},
		initialCommonsChunks: {
			minSize: 1
		}
	}
};
