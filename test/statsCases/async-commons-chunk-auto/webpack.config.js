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
			asyncCommonsChunks: false,
			asyncVendorsChunks: false
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
			asyncCommonsChunks: {
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
			asyncCommonsChunks: false,
			asyncVendorsChunks: true
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
			asyncCommonsChunks: false,
			initialCommonsChunks: {
				minSize: 1 // enforce all
			},
			initialVendorsChunks: true
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
			asyncCommonsChunks: {
				minSize: 1 // enforce all
			},
			initialVendorsChunks: {
				"libs": name => {
					const match = /[\\/](xyz|x)\.js/.exec(name);
					if(match) return "libs-" + match[1];
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
			asyncCommonsChunks: {
				minSize: 1 // enforce all
			},
			initialVendorsChunks: {
				"libs": name => {
					const match = /[\\/](xyz|x)\.js/.exec(name);
					if(match) return "libs-" + match[1];
				},
				vendors: path.resolve(__dirname, "node_modules")
			}
		},
		stats
	}
];
