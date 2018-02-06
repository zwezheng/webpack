const HTMLParser = require("./HTMLParser");
const HTMLGenerator = require("./HTMLGenerator");

const Template = require("../Template");
const { ConcatSource } = require("webpack-sources");

class HTMLModulesPlugin {
	constructor() {
		this.plugin = {
			name: "HTMLModulesPlugin"
		};
	}

	apply(compiler) {
		const { plugin } = this;
		const { compilation } = compiler.hooks;

		compilation.tap(plugin, (compilation, { normalModuleFactory }) => {
			const { createParser, createGenerator } = normalModuleFactory.hooks;

			createParser.for("html/experimental").tap(plugin, () => {
				return new HTMLParser();
			});

			createGenerator.for("html/experimental").tap(plugin, () => {
				return new HTMLGenerator();
			});

			const { chunkTemplate } = compilation;

			chunkTemplate.hooks.renderManifest.tap(plugin, (result, options) => {
				const chunk = options.chunk;
				const output = options.outputOptions;

				const { moduleTemplates, dependencyTemplates } = options;

				for (const module of chunk.modulesIterable) {
					if (module.type && module.type.startsWith("html")) {
						const filenameTemplate = output.HTMLModuleFilename;

						result.push({
							// render: () => this.renderHTMLModules(
							// 	module,
							// 	moduleTemplates.html,
							// 	dependencyTemplates
							// ),
							render: () =>
								this.renderHTML(
									chunkTemplate,
									chunk,
									moduleTemplates.html,
									dependencyTemplates
								),
							filenameTemplate,
							pathOptions: {
								module
							},
							identifier: `HTMLModule ${module.id}`,
							hash: module.hash
						});
					}
				}

				return result;
			});
		});
	}

	renderHTMLModules(module, moduleTemplate, dependencyTemplates) {
		return moduleTemplate.render(module, dependencyTemplates, {});
	}

	renderHTML(chunkTemplate, chunk, moduleTemplate, dependencyTemplates) {
		const { modules /* render */ } = chunkTemplate.hooks;

		const sources = Template.renderHTMLChunk(
			chunk,
			module => module.type.startsWith("html"),
			moduleTemplate,
			dependencyTemplates
		);

		const core = modules.call(
			sources,
			chunk,
			moduleTemplate,
			dependencyTemplates
		);

		// let source = render.call(
		// 	core,
		// 	chunk,
		// 	moduleTemplate,
		// 	dependencyTemplates
		// );

		chunk.rendered = true;

		return new ConcatSource(core);
	}
}

module.exports = HTMLModulesPlugin;
