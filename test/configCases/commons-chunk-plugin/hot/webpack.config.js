var HotModuleReplacementPlugin = require("../../../../lib/HotModuleReplacementPlugin");
module.exports = {
	entry: {
		vendor: ["./vendor"],
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
	},
	plugins: [
		new HotModuleReplacementPlugin()
	]
};
