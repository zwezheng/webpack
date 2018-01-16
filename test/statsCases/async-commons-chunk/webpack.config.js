module.exports = {
	mode: "production",
	entry: "./",
	optimization: {
		asyncCommonsChunks: {
			minSize: 1
		}
	},
	stats: {
		hash: false,
		timings: false,
		assets: false,
		chunks: true,
		chunkOrigins: true,
		modules: false
	}
};
