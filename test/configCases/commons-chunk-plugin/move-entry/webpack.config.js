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
		initialCommonsChunks: {
			minSize: 1,
			name: "commons"
		}
	}
};
