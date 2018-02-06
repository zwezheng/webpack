const { RawSource } = require("webpack-sources");

class CSSGenerator {
	generate(module, dependencyTemplates) {
		const source = module.originalSource();

		if (!source) {
			return new RawSource("throw new Error('No source available');");
		}

		for (const dependency of module.dependencies) {
			this.sourceDependency(source, dependency, dependencyTemplates);
		}

		return source;
	}

	sourceDependency(source, dependency, dependencyTemplates) {
		const template = dependencyTemplates.get(dependency.constructor);

		if (!template) {
			throw new Error(
				"No template for dependency: " + dependency.constructor.name
			);
		}

		return template.apply(source, dependency);
	}
}

module.exports = CSSGenerator;
