const CSSParser = require("./CSSParser");
const CSSGenerator = require("./CSSGenerator");
const CSSTemplate = require("./CSSTemplate");

const { ConcatSource } = require("webpack-sources");

class CSSModulesPlugin {
	constructor() {
		this.plugin = {
			name: "CSSModulesPlugin"
		};
	}

	apply(compiler) {
		const { plugin } = this;
		const { compilation } = compiler.hooks;

		compilation.tap(plugin, (compilation, { normalModuleFactory }) => {
			const { createParser, createGenerator } = normalModuleFactory.hooks;

			createParser.for("css/experimental").tap(plugin, options => {
				return new CSSParser(options);
			});

			createGenerator.for("css/experimental").tap(plugin, options => {
				return new CSSGenerator(options);
			});

			const { chunkTemplate } = compilation;

			chunkTemplate.hooks.renderManifest.tap(plugin, (result, options) => {
				const { chunk, moduleTemplates, dependencyTemplates } = options;

				const filenameTemplate = options.outputOptions.cssFilename;

				result.push({
					render: () =>
						this.renderCSS(
							chunkTemplate,
							chunk,
							moduleTemplates.css,
							dependencyTemplates
						),
					filenameTemplate,
					pathOptions: {
						chunk
					},
					identifier: `CSSChunk (${chunk.id})`,
					hash: chunk.hash
				});

				return result;
			});
		});
	}

	renderCSSModules(module, moduleTemplate, dependencyTemplates) {
		return moduleTemplate.render(module, dependencyTemplates, {});
	}

	renderCSS(chunkTemplate, chunk, moduleTemplate, dependencyTemplates) {
		const { modules } = chunkTemplate.hooks;

		const sources = CSSTemplate.renderChunk(
			chunk,
			module => module.type.startsWith("css"),
			moduleTemplate,
			dependencyTemplates
		);

		const result = modules.call(
			sources,
			chunk,
			moduleTemplate,
			dependencyTemplates
		);

		chunk.rendered = true;

		return new ConcatSource(result);
	}
}

module.exports = CSSModulesPlugin;
