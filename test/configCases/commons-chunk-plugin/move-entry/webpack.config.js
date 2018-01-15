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
		initialCommonsChunk: {
			minSize: 1,
			name: "commons"
		}
	}
};
