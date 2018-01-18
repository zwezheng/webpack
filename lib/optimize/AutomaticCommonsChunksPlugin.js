/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const SortableSet = require("../util/SortableSet");
const GraphHelpers = require("../GraphHelpers");

const sortByIdentifier = (a, b) => {
	if(a.identifier() > b.identifier()) return 1;
	if(a.identifier() < b.identifier()) return -1;
	return 0;
};

const getRequests = chunk => {
	let requests = 0;
	for(const chunkGroup of chunk.groupsIterable) {
		requests = Math.max(requests, chunkGroup.chunks.length);
	}
	return requests;
};

module.exports = class AutomaticCommonsChunksPlugin {
	constructor(options) {
		this.options = AutomaticCommonsChunksPlugin.normalizeOptions(options);
		this.alreadyOptimized = new WeakSet();
	}

	static normalizeOptions(options) {
		return {
			minSize: options.minSize || 0,
			includeInitialChunks: options.includeInitialChunks || false,
			minChunks: options.minChunks || 2,
			maxAsyncRequests: options.maxAsyncRequests || 1,
			maxInitialRequests: options.maxInitialRequests || 1,
			getName: AutomaticCommonsChunksPlugin.normalizeName(options.name),
			getCacheGroup: AutomaticCommonsChunksPlugin.normalizeCacheGroups(options.cacheGroups),
		};
	}

	static normalizeName(option) {
		if(option === true) {
			return (module, chunks) => {
				const names = chunks.map(c => c.name);
				if(!names.every(Boolean)) return;
				names.sort();
				return names.join("~");
			};
		}
		if(typeof option === "string") {
			return () => {
				return option;
			};
		}
		if(typeof option === "function")
			return option;
		return () => {};
	}

	static normalizeCacheGroups(cacheGroups) {
		if(typeof cacheGroups === "function") {
			return cacheGroups;
		}
		if(typeof cacheGroups === "string" || cacheGroups instanceof RegExp) {
			cacheGroups = {
				"vendors": cacheGroups
			};
		}
		if(cacheGroups && typeof cacheGroups === "object") {
			return (module, chunks) => {
				for(const key of Object.keys(cacheGroups)) {
					let option = cacheGroups[key];
					if(option instanceof RegExp || typeof option === "string") {
						option = {
							test: option
						};
					}
					if(typeof option === "function") {
						const result = option(module, chunks);
						if(result) {
							return Object.assign({
								key
							}, result);
						}
					}
					if(AutomaticCommonsChunksPlugin.checkTest(option.test, module)) {
						return {
							key: key,
							name: AutomaticCommonsChunksPlugin.normalizeName(option.name)(module, chunks),
							enforce: option.enforce
						};
					}
				}
			};
		}
		return () => {};
	}

	static checkTest(test, module) {
		if(typeof test === "function")
			return test(module);
		if(!module.nameForCondition)
			return false;
		const name = module.nameForCondition();
		if(typeof test === "string")
			return name.startsWith(test);
		if(test instanceof RegExp)
			return test.test(name);
		return !!test;
	}

	apply(compiler) {
		compiler.hooks.compilation.tap("AutomaticCommonsChunksPlugin", compilation => {
			compilation.hooks.unseal.tap("AutomaticCommonsChunksPlugin", () => {
				this.alreadyOptimized.delete(compilation);
			});
			compilation.hooks.optimizeChunksAdvanced.tap("AutomaticCommonsChunksPlugin", chunks => {
				if(this.alreadyOptimized.has(compilation)) return;
				this.alreadyOptimized.add(compilation);
				// Give each selected chunk an index (to create strings from chunks)
				const indexMap = new Map();
				let index = 1;
				for(const chunk of chunks) {
					if(this.options.includeInitialChunks || !chunk.isInitial())
						indexMap.set(chunk, index++);
				}
				// Map a list of chunks to a list of modules
				// For the key the chunk "index" is used, the value is a SortableSet of modules
				const chunksInfoMap = new Map();
				// Walk through all modules
				for(const module of compilation.modules) {
					// Ignore entry modules
					if(module.isEntryModule()) continue;
					// Get indices of chunks in which this module occurs
					const chunkIndices = Array.from(module.chunksIterable, chunk => indexMap.get(chunk)).filter(Boolean);
					// Get array of chunks
					const chunks = Array.from(module.chunksIterable).filter(chunk => indexMap.get(chunk) !== undefined);
					// Get cache group
					const cacheGroup = this.options.getCacheGroup(module, chunks);
					const groupKey = cacheGroup === undefined ? undefined : cacheGroup.key;
					const enforce = cacheGroup === undefined ? false : cacheGroup.enforce;
					const name = cacheGroup !== undefined ? cacheGroup.name : this.options.getName(module, chunks);
					// Break if minimum number of chunks is not reached
					if(!enforce && chunkIndices.length < this.options.minChunks)
						continue;
					// Create key for maps
					// When it has a name we use the name as key
					// Elsewise we create the key from chunks
					// This automatically merges equal names
					const chunksKey = chunkIndices.sort().join();
					let key = name || groupKey || chunksKey;
					key += !!enforce;
					// Add module to maps
					let info = chunksInfoMap.get(key);
					if(info === undefined) {
						chunksInfoMap.set(key, info = {
							modules: new SortableSet(undefined, sortByIdentifier),
							enforce,
							groupKey,
							name,
							chunks: new Map(),
							reusedableChunks: new Set(),
							chunksKeys: new Set()
						});
					}
					info.modules.add(module);
					if(!info.chunksKeys.has(chunksKey)) {
						info.chunksKeys.add(chunksKey);
						for(const chunk of chunks) {
							info.chunks.set(chunk, chunk.getNumberOfModules());
						}
					}
				}
				// Get size of module lists and sort them by name and size
				const entries = Array.from(chunksInfoMap.entries(), pair => {
					const info = pair[1];
					info.key = pair[0];
					info.size = Array.from(info.modules, m => m.size()).reduce((a, b) => a + b, 0);
					return info;
				}).filter(item => {
					if(item.enforce) return true;
					// Filter by size limit
					if(item.size < this.options.minSize) return false;
					return true;
				}).sort((a, b) => {
					// Sort
					// 1. by enforced (enforce first)
					const enforcedA = a.enforce;
					const enforcedB = b.enforce;
					if(enforcedA && !enforcedB) return -1;
					if(!enforcedA && enforcedB) return 1;
					// 2. by total modules size
					const diffSize = b.size - a.size;
					if(diffSize) return diffSize;
					const modulesA = a.modules;
					const modulesB = b.modules;
					// 3. by module identifiers
					const diff = modulesA.size - modulesB.size;
					if(diff) return diff;
					modulesA.sort();
					modulesB.sort();
					const aI = modulesA[Symbol.iterator]();
					const bI = modulesB[Symbol.iterator]();
					while(true) { // eslint-disable-line
						const aItem = aI.next();
						const bItem = bI.next();
						if(aItem.done) return 0;
						const aModuleIdentifier = aItem.value.identifier();
						const bModuleIdentifier = bItem.value.identifier();
						if(aModuleIdentifier > bModuleIdentifier) return -1;
						if(aModuleIdentifier < bModuleIdentifier) return 1;
					}
				});

				let changed = false;
				// Walk though all entries
				for(const item of entries) {
					let chunkName = item.name;
					const enforced = item.enforce;
					// Variable for the new chunk (lazy created)
					let newChunk;
					// When not enforced, check if we can reuse a chunk instead of creating a new one
					let isReused = false;
					if(!enforced) {
						for(const pair of item.chunks) {
							if(pair[1] === item.modules.size) {
								const chunk = pair[0];
								if(chunk.hasEntryModule()) continue;
								if(!newChunk || !newChunk.name)
									newChunk = chunk;
								else if(chunk.name && chunk.name.length < newChunk.name.length)
									newChunk = chunk;
								else if(chunk.name && chunk.name.length === newChunk.name.length && chunk.name < newChunk.name)
									newChunk = chunk;
								chunkName = undefined;
								isReused = true;
							}
						}
					}
					// Walk through all chunks
					for(const chunk of item.chunks.keys()) {
						// skip if we address ourself
						if(chunk.name === chunkName || chunk === newChunk) continue;
						// respect max requests when not enforced
						if(!enforced) {
							const maxRequests = chunk.isInitial() ?
								this.options.maxInitialRequests :
								this.options.maxAsyncRequests;
							if(getRequests(chunk) >= maxRequests) continue;
						}
						if(newChunk === undefined) {
							// Create the new chunk
							newChunk = compilation.addChunk(chunkName);
						}
						// Add graph connections for splitted chunk
						chunk.split(newChunk);
						// Remove all selected modules from the chunk
						for(const module of item.modules) {
							chunk.removeModule(module);
							module.rewriteChunkInReasons(chunk, [newChunk]);
						}
					}
					// If we successfully creates a new chunk
					if(isReused) {
						// Add a note to the chunk
						newChunk.chunkReason = item.groupKey + ": reused as commons chunk";
						if(chunkName) {
							newChunk.chunkReason += " " + chunkName;
						}
						changed = true;
					} else if(newChunk) {
						// Add a note to the chunk
						newChunk.chunkReason = item.groupKey + ": " + (enforced ? "vendors" : "commons") + " chunk";
						// If the choosen name is already an entry point we remove the entry point
						if(chunkName) {
							const entrypoint = compilation.entrypoints.get(chunkName);
							if(entrypoint) {
								compilation.entrypoints.delete(chunkName);
								entrypoint.remove();
								newChunk.entryModule = undefined;
							}
							newChunk.chunkReason += " " + chunkName;
						}
						// Add all modules to the new chunk
						for(const module of item.modules) {
							GraphHelpers.connectChunkAndModule(newChunk, module);
						}
						changed = true;
					}
				}
				if(changed) return true;
			});
		});
	}
};
