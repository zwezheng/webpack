module.exports = {
	entry: {
		vendor: ["external0", "./a"],
		main: "./index"
	},
	target: "web",
	output: {
		filename: "[name].js",
		libraryTarget: "umd"
	},
	externals: ["external0", "external1", "external2", "fs", "path"],
	optimization: {
		initialCommonsChunks: {
			minSize: 1,
			name: "vendor"
		}
	},
	node: {
		__filename: false,
		__dirname: false
	}
};
