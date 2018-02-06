const {
	CSSURLDependency,
	CSSImportDependency,
	CSSExportDependency
} = require("./dependencies");

class CSSDependencyPlugin {
	constructor(options) {
		this.plugin = "CSSDependencyPlugin";
		this.options = options;
	}

	apply(compiler) {
		const { plugin } = this;
		const { compilation } = compiler.hooks;

		compilation.tap(plugin, (compilation, { normalModuleFactory }) => {
			const { dependencyFactories, dependencyTemplates } = compilation;

			dependencyFactories.set(CSSURLDependency, normalModuleFactory);
			dependencyFactories.set(CSSImportDependency, normalModuleFactory);
			dependencyFactories.set(CSSExportDependency, normalModuleFactory);

			dependencyTemplates.set(
				CSSURLDependency,
				new CSSURLDependency.Template()
			);

			dependencyTemplates.set(
				CSSImportDependency,
				new CSSImportDependency.Template()
			);

			dependencyTemplates.set(
				CSSExportDependency,
				new CSSExportDependency.Template()
			);
		});
	}
}

module.exports = CSSDependencyPlugin;
