var webpack = require("../../../../");

module.exports = {
	optimization: {
		asyncCommonsChunks: {
			minSize: 1
		}
	}
};
