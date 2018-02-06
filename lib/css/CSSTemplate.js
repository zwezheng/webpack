const { ConcatSource } = require("webpack-sources");

class CSSTemplate {
	static renderChunk(
		chunk,
		filterFn,
		moduleTemplate,
		dependencyTemplates,
		prefix
	) {
		// if(!prefix) prefix = "";

		const result = new ConcatSource();

		const modules = chunk.getModules().filter(filterFn);
		const removedModules = chunk.removedModules;

		const sources = modules.map(module => {
			return {
				id: module.id,
				source: moduleTemplate.render(module, dependencyTemplates, { chunk })
			};
		});

		if (removedModules && removedModules.length > 0) {
			for (const id of removedModules) {
				sources.push({
					id,
					source: "/* CSS Module removed */"
				});
			}
		}

		sources.sort().reduceRight((result, module, idx) => {
			result.add(`\n/* ${module.id} */\n`);
			result.add(module.source);

			return result;
		}, result);

		result.add("\n" /* + prefix */);

		return result;
	}
}

module.exports = CSSTemplate;
