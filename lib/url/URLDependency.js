const {
	URLDependency
} = require('./dependencies');

class URLDependencyPlugin {
	constructor(options) {
		this.plugin = {
			name: "URLDependencyPlugin"
		};
		this.options = options;
	}

	apply(compiler) {
		const { plugin } = this;
		const { compilation } = compiler.hooks

		compilation.tap(plugin, (compilation, { normalModuleFactory }) => {
			const { dependencyFactories } = compilation;

			dependencyFactories.set(URLDependency, normalModuleFactory);
		});
	}
}

module.exports = URLDependencyPlugin;
