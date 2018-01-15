module.exports = {
	entry: {
		vendor: ["./a"],
		main: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js"
	},
	optimization: {
		initialCommonsChunk: {
			minSize: 1,
			name: "vendor"
		}
	}
};
