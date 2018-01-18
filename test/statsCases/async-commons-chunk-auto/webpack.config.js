const path = require("path");
const stats = {
	hash: false,
	timings: false,
	assets: false,
	chunks: true,
	chunkOrigins: true,
	entrypoints: true,
	modules: false
};
module.exports = [
	{
		name: "disabled",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c"
		},
		output: {
			filename: "disabled/[name].js"
		},
		optimization: {
			splitChunks: false
		},
		stats
	},
	{
		name: "default",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c"
		},
		output: {
			filename: "default/[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 1 // enforce all
			}
		},
		stats
	},
	{
		name: "async-vendors",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c"
		},
		output: {
			filename: "async-vendors/[name].js"
		},
		optimization: {
			splitChunks: {
				minChunks: Infinity,
				cacheGroups: {
					vendors: {
						test: /[\\/]node_modules[\\/]/,
						enforce: true
					}
				}
			}
		},
		stats
	},
	{
		name: "vendors1",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c"
		},
		output: {
			filename: "vendors1/[name].js"
		},
		optimization: {
			splitChunks: {
				includeInitialChunks: true,
				minSize: 1,
				cacheGroups: {
					vendors: {
						test: /[\\/]node_modules[\\/]/,
						enforce: true
					}
				}
			}
		},
		stats
	},
	{
		name: "async-and-vendor",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c",
			vendors: "xy"
		},
		output: {
			filename: "async-and-vendor/[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 1, // enforce all
				cacheGroups: {
					"libs": module => {
						if(!module.nameForCondition) return;
						const name = module.nameForCondition();
						const match = /[\\/](xyz|x)\.js/.exec(name);
						if(match) return {
							name: "libs-" + match[1],
							enforce: true
						};
					},
					vendors: path.resolve(__dirname, "node_modules")
				}
		},
		stats
	},
	{
		name: "all",
		mode: "production",
		entry: {
			main: "./",
			a: "./a",
			b: "./b",
			c: "./c"
		},
		output: {
			filename: "all/[name].js"
		},
		optimization: {
			splitChunks: {
				minSize: 1, // enforce all
				cacheGroups: {
					vendors: path.resolve(__dirname, "node_modules")
				}
			}
		},
		stats
	}
];
