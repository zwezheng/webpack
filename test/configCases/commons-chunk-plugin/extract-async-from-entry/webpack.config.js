module.exports = {
	entry: {
		main: "./index",
		second: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		asyncCommonsChunks: {
			minSize: 1
		}
	}
};
