module.exports = {
	entry: {
		main: "./index",
		misc: "./second",
	},
	output: {
		filename: "[name].js"
	},
	optimization: {
		asyncCommonsChunk: {
			minSize: 1
		},
		initialCommonsChunk: {
			minSize: 1
		}
	}
};
