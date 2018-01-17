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
		this.options = Object.assign({}, {
			initialChunks: false,
			minSize: 30000,
			minChunks: 2,
			maxRequests: 4,
			name: undefined, // function(module, chunks) => string | undefined
			enforce: undefined // function(module, module) => true | false
		}, options);
		this.alreadyOptimized = new WeakSet();
	}

	apply(compiler) {
		compiler.hooks.compilation.tap("AutomaticCommonsChunksPlugin", compilation => {
			compilation.hooks.optimizeChunksAdvanced.tap("AutomaticCommonsChunksPlugin", chunks => {
				if(this.alreadyOptimized.has(compilation)) return;
				this.alreadyOptimized.add(compilation);
				// Give each selected chunk an index (to create strings from chunks)
				const indexMap = new Map();
				let index = 1;
				for(const chunk of chunks) {
					if(chunk.isInitial() === this.options.initialChunks)
						indexMap.set(chunk, index++);
				}
				// Map a list of chunks to a list of modules
				// For the key the chunk "index" is used, the value is a SortableSet of modules
				const chunksInfoMap = new Map();
				// Walk through all modules
				for(const module of compilation.modules) {
					// Get indices of chunks in which this module occurs
					const chunkIndices = Array.from(module.chunksIterable, chunk => indexMap.get(chunk)).filter(Boolean);
					// Get array of chunks
					const chunks = Array.from(module.chunksIterable).filter(chunk => indexMap.get(chunk) !== undefined);
					// Get enforce from "enforce" option
					let enforce = this.options.enforce;
					if(typeof enforce === "function")
						enforce = enforce(module, chunks);
					// Break if minimum number of chunks is not reached
					if(!enforce && chunkIndices.length < this.options.minChunks)
						continue;
					// Get name from "name" option
					let name = typeof enforce === "string" ? enforce : this.options.name;
					if(typeof name === "function")
						name = name(module, chunks);
					// Create key for maps
					// When it has a name we use the name as key
					// Elsewise we create the key from chunks
					// This automatically merges equal names
					const chunksKey = chunkIndices.sort().join();
					let key = name ? name : chunksKey;
					if(enforce) key += ",enforced";
					// Add module to maps
					let info = chunksInfoMap.get(key);
					if(info === undefined) {
						chunksInfoMap.set(key, info = {
							modules: new SortableSet(undefined, sortByIdentifier),
							enforce,
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
				console.log(entries.map(e => {
					return {
						key: e.key,
						size: e.size,
						enforce: e.enforce,
						chunks: Array.from(e.chunks.keys(), c => c.name || c.debugId)
					};
				}));

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
						// respect max requests when not a named chunk
						if(!enforced && getRequests(chunk) >= this.options.maxRequests) continue;
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
						newChunk.chunkReason = "reused as commons chunk";
						if(chunkName) {
							newChunk.chunkReason += " " + chunkName;
						}
						changed = true;
					} else if(newChunk) {
						// Add a note to the chunk
						newChunk.chunkReason = enforced ? "vendors chunk" : "commons chunk";
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
