/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const ChunkGroup = require("./ChunkGroup");

class Entrypoint extends ChunkGroup {
	constructor(name) {
		super(name);
		this.runtimeChunk = undefined;
	}

	isInitial() {
		return true;
	}

	getFiles() {
		const files = new Set();

		for(let chunkIdx = 0; chunkIdx < this.chunks.length; chunkIdx++) {
			for(let fileIdx = 0; fileIdx < this.chunks[chunkIdx].files.length; fileIdx++) {
				files.add(this.chunks[chunkIdx].files[fileIdx]);
			}
		}

		return Array.from(files);
	}

	setRuntimeChunk(chunk) {
		this.runtimeChunk = chunk;
	}

	getRuntimeChunk() {
		return this.runtimeChunk || this.chunks[0];
	}

	getChunkMaps(includeInitial, realHash) {
		const chunkHashMap = Object.create(null);
		const chunkNameMap = Object.create(null);

		const queue = new Set([this]);
		const chunks = new Set();

		for(const chunkGroup of queue) {
			if(includeInitial || !chunkGroup.isInitial())
				for(const chunk of chunkGroup.chunks)
					chunks.add(chunk);
			for(const child of chunkGroup.childrenIterable)
				queue.add(child);
		}

		for(const chunk of chunks) {
			chunkHashMap[chunk.id] = realHash ? chunk.hash : chunk.renderedHash;
			if(chunk.name)
				chunkNameMap[chunk.id] = chunk.name;
		}

		return {
			hash: chunkHashMap,
			name: chunkNameMap
		};
	}

	getChunkModuleMaps(includeInitial, filterFn) {
		const chunkModuleIdMap = Object.create(null);
		const chunkModuleHashMap = Object.create(null);

		const queue = new Set([this]);
		const chunks = new Set();

		for(const chunkGroup of queue) {
			if(includeInitial || !chunkGroup.isInitial())
				for(const chunk of chunkGroup.chunks)
					chunks.add(chunk);
			for(const child of chunkGroup.childrenIterable)
				queue.add(child);
		}

		for(const chunk of chunks) {
			let array;
			for(const module of chunk.modulesIterable) {
				if(filterFn(module)) {
					if(array === undefined) {
						array = [];
						chunkModuleIdMap[chunk.id] = array;
					}
					array.push(module.id);
					chunkModuleHashMap[module.id] = module.renderedHash;
				}
			}
			if(array !== undefined) {
				array.sort();
			}
		}

		return {
			id: chunkModuleIdMap,
			hash: chunkModuleHashMap
		};
	}

	hasModuleInGraph(filterFn, filterChunkFn) {
		const queue = new Set([this]);
		const chunksProcessed = new Set();

		for(const chunkGroup of queue) {
			for(const chunk of chunkGroup.chunks) {
				if(!chunksProcessed.has(chunk)) {
					chunksProcessed.add(chunk);
					if(!filterChunkFn || filterChunkFn(chunk)) {
						for(const module of chunk.modulesIterable)
							if(filterFn(module))
								return true;
					}
				}
			}
			for(const child of chunkGroup.childrenIterable)
				queue.add(child);
		}
		return false;
	}
}

module.exports = Entrypoint;
