const { HTMLURLDependency, HTMLImportDependency } = require("./dependencies");

class HTMLDependencyPlugin {
	constructor(options) {
		this.plugin = "HTMLDependencyPlugin";
		this.options = options;
	}

	apply(compiler) {
		const { plugin } = this;
		const { compilation } = compiler.hooks;

		compilation.tap(plugin, (compilation, { normalModuleFactory }) => {
			const { dependencyFactories, dependencyTemplates } = compilation;

			dependencyFactories.set(HTMLURLDependency, normalModuleFactory);
			dependencyFactories.set(HTMLImportDependency, normalModuleFactory);

			dependencyTemplates.set(
				HTMLImportDependency,
				new HTMLImportDependency.Template()
			);
		});
	}
}

module.exports = HTMLDependencyPlugin;
