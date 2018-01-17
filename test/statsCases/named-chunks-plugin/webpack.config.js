var NamedChunksPlugin = require("../../../lib/NamedChunksPlugin");
var NamedModulesPlugin = require("../../../lib/NamedModulesPlugin");

module.exports = {
	mode: "production",
	entry: {
		"entry": "./entry",
		"vendor": ["./modules/a", "./modules/b"],
	},
	optimization: {
		initialCommonsChunks: {
			minSize: 1,
			name: "vendor"
		}
	},
	plugins: [
		new NamedChunksPlugin(),
		new NamedModulesPlugin(),
	]
};
