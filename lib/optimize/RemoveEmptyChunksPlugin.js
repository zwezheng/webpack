/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { STAGE_BASIC, STAGE_ADVANCED } = require("../OptimizationStages");

class RemoveEmptyChunksPlugin {
	apply(compiler) {
		compiler.hooks.compilation.tap("RemoveEmptyChunksPlugin", compilation => {
			const handler = chunks => {
				for (let i = chunks.length - 1; i >= 0; i--) {
					const chunk = chunks[i];
					if (
						chunk.isEmpty() &&
						!chunk.hasRuntime() &&
						!chunk.hasEntryModule()
					) {
						chunk.remove("empty");
						chunks.splice(i, 1);
					}
				}
			};

			// TODO do it once
			compilation.hooks.optimizeChunks.tap(
				{ name: "RemoveEmptyChunksPlugin", stage: STAGE_BASIC },
				handler
			);
			compilation.hooks.optimizeChunks.tap(
				{ name: "RemoveEmptyChunksPlugin", stage: STAGE_ADVANCED },
				handler
			);
		});
	}
}
module.exports = RemoveEmptyChunksPlugin;
