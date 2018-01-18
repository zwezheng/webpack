/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const identifierUtils = require("../util/identifier");
const intersect = require("../util/SetHelpers").intersect;
const validateOptions = require("schema-utils");
const schema = require("../../schemas/plugins/optimize/AggressiveSplittingPlugin.json");

const moveModuleBetween = (oldChunk, newChunk) => {
	return module => {
		oldChunk.moveModule(module, newChunk);
	};
};

const isNotAEntryModule = entryModule => {
	return module => {
		return entryModule !== module;
	};
};

class AggressiveSplittingPlugin {
	constructor(options) {
		validateOptions(schema, options || {}, "Aggressive Splitting Plugin");

		this.options = options || {};
		if(typeof this.options.minSize !== "number") this.options.minSize = 30 * 1024;
		if(typeof this.options.maxSize !== "number") this.options.maxSize = 50 * 1024;
		if(typeof this.options.chunkOverhead !== "number") this.options.chunkOverhead = 0;
		if(typeof this.options.entryChunkMultiplicator !== "number") this.options.entryChunkMultiplicator = 1;

		this.usedSplitsMap = new WeakMap();
		this.fromAggressiveSplittingSet = new WeakSet();
		this.aggressiveSplittingInvalidSet = new WeakSet();
		this.fromAggressiveSplittingIndexMap = new WeakMap();
	}
	apply(compiler) {
		compiler.hooks.thisCompilation.tap("AggressiveSplittingPlugin", (compilation) => {
			compilation.hooks.optimizeChunksAdvanced.tap("AggressiveSplittingPlugin", (chunks) => {
				for(const chunk of chunks)
					console.log(`${chunk.debugId} =\n${Array.from(chunk.modulesIterable, m => ` * ${m.resource}`).join("\n")}`);
				// Precompute stuff
				const nameToModuleMap = new Map();
				compilation.modules.forEach(m => {
					const name = identifierUtils.makePathsRelative(compiler.context, m.identifier(), compilation.cache);
					nameToModuleMap.set(name, m);
				});

				const savedSplits = compilation.records && compilation.records.aggressiveSplits || [];
				let storedSplits = this.usedSplitsMap.get(compilation);
				const usedSplits = storedSplits ?
					savedSplits.concat(storedSplits) : savedSplits;

				const minSize = this.options.minSize;
				const maxSize = this.options.maxSize;
				// 1. try to restore to recorded splitting
				for(let j = 0; j < usedSplits.length; j++) {
					const splitData = usedSplits[j];
					const selectedModules = splitData.modules.map(name => nameToModuleMap.get(name));
					console.log("Try to split", splitData);

					// Does the modules exist at all?
					if(!selectedModules.every(Boolean)) continue;
					console.log("modules ok");

					const selectedChunks = intersect(selectedModules.map(m => new Set(m.chunksIterable)));

					// No relevant chunks found
					if(selectedChunks.size === 0) continue;

					// The found chunk is already the split or similar
					if(selectedChunks.size === 1 && Array.from(selectedChunks)[0].getNumberOfModules() === selectedModules.length) continue;

					// split the chunk into two parts
					const newChunk = compilation.addChunk();
					for(const chunk of selectedChunks) {
						selectedModules.forEach(moveModuleBetween(chunk, newChunk));
						chunk.split(newChunk);
						chunk.name = null;
					}
					this.fromAggressiveSplittingSet.add(newChunk);
					if(j < savedSplits.length)
						this.fromAggressiveSplittingIndexMap.set(newChunk, j);
					if(splitData.id !== null && splitData.id !== undefined) {
						console.log(`AggressiveSplittingPlugin assign id ${splitData.id}`);
						newChunk.id = splitData.id;
					}

						// Find all chunks containing all modules in the split
						for(let i = 0; i < chunks.length; i++) {
							const chunk = chunks[i];

							// Cheap check if chunk is suitable at all
							if(chunk.getNumberOfModules() < splitData.modules.length)
								continue;

							// Check if all modules are in the chunk
							if(selectedModules.every(m => chunk.containsModule(m))) {

								console.log("found chunk " + chunk.debugId);

								const existingSplit = this.xxx.get(splitData);

								// Did we already create a chunk for this split?
								if(existingSplit !== undefined) {
									console.log("use existing split");
									// Is chunk identical to the split or do we need to split it?
									if(chunk.getNumberOfModules() > splitData.modules.length) {
										selectedModules.forEach(moveModuleBetween(chunk, existingSplit));
										chunk.split(existingSplit);
										chunk.name = null;
									} else {
										if(existingSplit.integrate(chunk, "aggressive-splitting"))
											chunks.splice(i--, 1);
									}
								} else {
									// Is chunk identical to the split or do we need to split it?
									if(chunk.getNumberOfModules() > splitData.modules.length) {
										// split the chunk into two parts
										const newChunk = compilation.addChunk();
										selectedModules.forEach(moveModuleBetween(chunk, newChunk));
										chunk.split(newChunk);
										chunk.name = null;
										this.xxx.set(splitData, newChunk);
										this.fromAggressiveSplittingSet.add(newChunk);
										if(j < savedSplits.length)
											this.fromAggressiveSplittingIndexMap.set(newChunk, j);
										if(splitData.id !== null && splitData.id !== undefined) {
											console.log(`AggressiveSplittingPlugin assign id ${splitData.id}`);
											newChunk.id = splitData.id;
										}
										return true;
									} else { // chunk is identical to the split
										if(j < savedSplits.length)
											this.fromAggressiveSplittingIndexMap.set(chunk, j);
										chunk.name = null;
										this.xxx.set(splitData, chunk);
										if(splitData.id !== null && splitData.id !== undefined) {
											console.log(`AggressiveSplittingPlugin assign id ${splitData.id}`);
											chunk.id = splitData.id;
										}
									}
								}
							}
						}
					}
				}

				// 2. for any other chunk which isn't splitted yet, split it
				for(let i = 0; i < chunks.length; i++) {
					const chunk = chunks[i];
					const size = chunk.size(this.options);
					if(size > maxSize && chunk.getNumberOfModules() > 1) {
						const newChunk = compilation.addChunk();
						const modules = chunk.getModules()
							.filter(isNotAEntryModule(chunk.entryModule))
							.sort((a, b) => {
								a = a.identifier();
								b = b.identifier();
								if(a > b) return 1;
								if(a < b) return -1;
								return 0;
							});
						for(let k = 0; k < modules.length; k++) {
							chunk.moveModule(modules[k], newChunk);
							const newSize = newChunk.size(this.options);
							const chunkSize = chunk.size(this.options);
							// break early if it's fine
							if(chunkSize < maxSize && newSize < maxSize && newSize >= minSize && chunkSize >= minSize)
								break;
							if(newSize > maxSize && k === 0) {
								// break if there is a single module which is bigger than maxSize
								break;
							}
							if(newSize > maxSize || chunkSize < minSize) {
								// move it back
								newChunk.moveModule(modules[k], chunk);
								// check if it's fine now
								if(newSize < maxSize && newSize >= minSize && chunkSize >= minSize)
									break;
							}
						}
						if(newChunk.getNumberOfModules() > 0) {
							chunk.split(newChunk);
							chunk.name = null;
							storedSplits = (storedSplits || []).concat({
								modules: newChunk.mapModules(m => identifierUtils.makePathsRelative(compiler.context, m.identifier(), compilation.cache))
							});
							this.usedSplitsMap.set(compilation, storedSplits);
							return true;
						} else {
							chunks.splice(chunks.indexOf(newChunk), 1);
						}
					}
				}
			});
			compilation.hooks.recordHash.tap("AggressiveSplittingPlugin", (records) => {
				// 3. save to made splittings to records
				const minSize = this.options.minSize;
				if(!records.aggressiveSplits) records.aggressiveSplits = [];
				const newSplits = [];
				let splittingInvalid = false;
				compilation.chunks.forEach((chunk) => {
					if(chunk.hasEntryModule()) return;
					const size = chunk.size(this.options);
					const incorrectSize = size < minSize;
					const modules = chunk.mapModules(m => identifierUtils.makePathsRelative(compiler.context, m.identifier(), compilation.cache));
					const index = this.fromAggressiveSplittingIndexMap.get(chunk);
					if(typeof index === "undefined") {
						if(incorrectSize) return;
						// this is a new chunk splitting, we record it so we reuse it next time
						chunk.recorded = true;
						newSplits.push({
							modules: modules,
							hash: chunk.hash,
							id: chunk.id
						});
					} else {
						const splitData = records.aggressiveSplits[index];
						if(splitData.hash !== chunk.hash || incorrectSize) {
							if(this.fromAggressiveSplittingSet.has(chunk)) {
								this.aggressiveSplittingInvalidSet.add(chunk);
								splitData.invalid = true;
								splittingInvalid = true;
							} else {
								splitData.hash = chunk.hash;
							}
						}
						console.log(splitData);
					}
				});
				if(splittingInvalid) {
					records.aggressiveSplits = records.aggressiveSplits.filter((splitData) => {
						return !splitData.invalid;
					});
				} else {
					console.log(newSplits);
					records.aggressiveSplits = records.aggressiveSplits.concat(newSplits);
				}
			});
			compilation.hooks.needAdditionalSeal.tap("AggressiveSplittingPlugin", () => {
				const invalid = compilation.chunks.some((chunk) => {
					return this.aggressiveSplittingInvalidSet.has(chunk);
				});
				if(invalid)
					return true;
			});
		});
	}
}
module.exports = AggressiveSplittingPlugin;
