/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const GraphHelpers = require("../GraphHelpers");

class EnsureChunkConditionsPlugin {

	apply(compiler) {
		compiler.hooks.compilation.tap("EnsureChunkConditionsPlugin", (compilation) => {
			const triesMap = new Map();
			const handler = (chunks) => {
				let changed = false;
				for(const module of compilation.modules) {
					if(!module.chunkCondition) continue;
					const sourceChunks = new Set();
					const chunkGroups = new Set();
					for(const chunk of module.chunksIterable) {
						if(!module.chunkCondition(chunk)) {
							sourceChunks.add(chunk);
							for(const group of chunk.groupsIterable) {
								chunkGroups.add(group);
							}
						}
					}
					if(sourceChunks.size === 0) continue;
					const targetChunks = new Set();
					chunkGroupLoop: for(const chunkGroup of chunkGroups) {
						// Can module be placed in a chunk of this group?
						for(const chunk of chunkGroup.chunks) {
							if(module.chunkCondition(chunk)) {
								targetChunks.add(chunk);
								continue chunkGroupLoop;
							}
						}
						// We reached the entrypoint: fail
						if(chunkGroup.isInitial()) {
							throw new Error("Cannot fullfill chunk condition of " + module.identifier());
						}
						// Try placing in all parents
						for(const group of chunkGroup.parentsIterable) {
							chunkGroups.add(group);
						}
					}
					for(const sourceChunk of sourceChunks) {
						GraphHelpers.disconnectChunkAndModule(sourceChunk, module);
					}
					for(const targetChunk of targetChunks) {
						GraphHelpers.connectChunkAndModule(targetChunk, module);
					}
				}
				chunks.forEach((chunk) => {
					for(const module of chunk.modulesIterable) {
						if(!module.chunkCondition) continue;
						if(!module.chunkCondition(chunk)) {
							let usedChunks = triesMap.get(module);
							if(!usedChunks) triesMap.set(module, usedChunks = new Set());
							usedChunks.add(chunk);
							const newChunks = [];
							for(const parent of chunk.parentsIterable) {
								if(!usedChunks.has(parent)) {
									parent.addModule(module);
									module.addChunk(parent);
									newChunks.push(parent);
								}
							}
							module.rewriteChunkInReasons(chunk, newChunks);
							chunk.removeModule(module);
							changed = true;
						}
					}
				});
				if(changed) return true;
			};
			compilation.hooks.optimizeChunksBasic.tap("EnsureChunkConditionsPlugin", handler);
			compilation.hooks.optimizeExtractedChunksBasic.tap("EnsureChunkConditionsPlugin", handler);
		});
	}
}
module.exports = EnsureChunkConditionsPlugin;
