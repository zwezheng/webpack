const ModuleDependency = require("../../dependencies/ModuleDependency");

class CSSURLDependency extends ModuleDependency {
	constructor(request, name) {
		super(request);

		this.name = name;
	}

	get type() {
		return "css url";
	}

	getReference() {
		if (!this.module) {
			return null;
		}

		return {
			module: this.module,
			importedNames: [this.name]
		};
	}
}

CSSURLDependency.Template = class CSSURLDependencyTemplate {
	apply(source, { name, module }) {
		if (module.buildInfo.assets) {
			source._value = source._value.replace(
				"${" + name + "}",
				`'/${Object.keys(module.buildInfo.assets)[0]}'`
			);
		}

		return source;
	}
};

module.exports = CSSURLDependency;
