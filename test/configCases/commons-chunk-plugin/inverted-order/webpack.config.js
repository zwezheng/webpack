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
		initialCommonsChunks: {
			minSize: 1,
			name: "vendor"
		}
	}
};
