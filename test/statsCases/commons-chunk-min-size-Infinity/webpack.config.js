module.exports = {
	mode: "production",
	entry: {
		"entry-1": "./entry-1"
	},
	optimization: {
		initialVendorsChunks: {
			"vendor-1": /modules[\\/][abc]/
		}
	}
};
