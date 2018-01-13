/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const util = require("util");
const compareLocations = require("./compareLocations");
const ChunkGroup = require("./ChunkGroup");
const SortableSet = require("./util/SortableSet");
let debugId = 1000;

const sortById = (a, b) => {
	if(a.id < b.id) return -1;
	if(b.id < a.id) return 1;
	return 0;
};

const sortByIdentifier = (a, b) => {
	if(a.identifier() > b.identifier()) return 1;
	if(a.identifier() < b.identifier()) return -1;
	return 0;
};

const getFrozenArray = set => Object.freeze(Array.from(set));

const getModulesIdent = set => {
	set.sort();
	let str = "";
	set.forEach(m => {
		str += m.identifier() + "#";
	});
	return str;
};

const getArray = set => Array.from(set);

const getModulesSize = set => {
	let count = 0;
	for(const module of set) {
		count += module.size();
	}
	return count;
};

class Chunk {

	constructor(name) {
		this.id = null;
		this.ids = null;
		this.debugId = debugId++;
		this.name = name;
		this.entryModule = undefined;
		this._modules = new SortableSet(undefined, sortByIdentifier);
		this._groups = new SortableSet(undefined, sortById);
		this.files = [];
		this.rendered = false;
		this.hash = undefined;
		this.renderedHash = undefined;
		this.chunkReason = undefined;
		this.extraAsync = false;
	}

	get entry() {
		throw new Error("Chunk.entry was removed. Use hasRuntime()");
	}

	set entry(data) {
		throw new Error("Chunk.entry was removed. Use hasRuntime()");
	}

	get initial() {
		throw new Error("Chunk.initial was removed. Use isInitial()");
	}

	set initial(data) {
		throw new Error("Chunk.initial was removed. Use isInitial()");
	}

	hasRuntime() {
		for(const entrypoint of this._entrypoints) {
			// We only need to check the first one
			return entrypoint.getRuntimeChunkGroup() === this;
		}
		return false;
	}

	isInitial() {
		return !!this.entrypoint;
	}

	hasEntryModule() {
		return !!this.entryModule;
	}

	addModule(module) {
		if(!this._modules.has(module)) {
			this._modules.add(module);
			return true;
		}
		return false;
	}

	removeModule(module) {
		if(this._modules.delete(module)) {
			module.removeChunk(this);
			return true;
		}
		return false;
	}

	setModules(modules) {
		this._modules = new SortableSet(modules, sortByIdentifier);
	}

	getNumberOfModules() {
		return this._modules.size;
	}

	get modulesIterable() {
		return this._modules;
	}

	forEachModule(fn) {
		this._modules.forEach(fn);
	}

	mapModules(fn) {
		return Array.from(this._modules, fn);
	}

	compareTo(otherChunk) {
		this._modules.sort();
		otherChunk._modules.sort();
		if(this._modules.size > otherChunk._modules.size) return -1;
		if(this._modules.size < otherChunk._modules.size) return 1;
		const a = this._modules[Symbol.iterator]();
		const b = otherChunk._modules[Symbol.iterator]();
		while(true) { // eslint-disable-line
			const aItem = a.next();
			const bItem = b.next();
			if(aItem.done) return 0;
			const aModuleIdentifier = aItem.value.identifier();
			const bModuleIdentifier = bItem.value.identifier();
			if(aModuleIdentifier > bModuleIdentifier) return -1;
			if(aModuleIdentifier < bModuleIdentifier) return 1;
		}
	}

	containsModule(module) {
		return this._modules.has(module);
	}

	getModules() {
		return this._modules.getFromCache(getArray);
	}

	getModulesIdent() {
		return this._modules.getFromUnorderedCache(getModulesIdent);
	}

	remove(reason) {
		// cleanup modules
		// Array.from is used here to create a clone, because removeChunk modifies this._modules
		for(const module of Array.from(this._modules)) {
			module.removeChunk(this);
		}
	}

	moveModule(module, otherChunk) {
		module.removeChunk(this);
		module.addChunk(otherChunk);
		otherChunk.addModule(module);
		module.rewriteChunkInReasons(this, [otherChunk]);
	}

	integrate(otherChunk, reason) {
		if(!this.canBeIntegrated(otherChunk)) {
			return false;
		}

		// Array.from is used here to create a clone, because moveModule modifies otherChunk._modules
		for(const module of Array.from(otherChunk._modules)) {
			otherChunk.moveModule(module, this);
		}
		otherChunk._modules.clear();

		for(const parentChunk of otherChunk._parents) {
			parentChunk.replaceChunk(otherChunk, this);
		}
		otherChunk._parents.clear();

		for(const chunk of otherChunk._chunks) {
			chunk.replaceParentChunk(otherChunk, this);
		}
		otherChunk._chunks.clear();

		for(const b of otherChunk._blocks) {
			b.chunks = b.chunks ? b.chunks.map(c => {
				return c === otherChunk ? this : c;
			}) : [this];
			b.chunkReason = reason;
			this.addBlock(b);
		}
		otherChunk._blocks.clear();

		otherChunk.origins.forEach(origin => {
			this.origins.push(origin);
		});
		for(const b of this._blocks) {
			b.chunkReason = reason;
		}
		this.origins.forEach(origin => {
			if(!origin.reasons) {
				origin.reasons = [reason];
			} else if(origin.reasons[0] !== reason) {
				origin.reasons.unshift(reason);
			}
		});
		this._chunks.delete(otherChunk);
		this._chunks.delete(this);
		this._parents.delete(otherChunk);
		this._parents.delete(this);
		return true;
	}

	split(newChunk) {
		for(const chunkGroup of this._groups) {
			chunkGroup.insertChunk(newChunk, this);
		}
	}

	isEmpty() {
		return this._modules.size === 0;
	}

	updateHash(hash) {
		hash.update(`${this.id} `);
		hash.update(this.ids ? this.ids.join(",") : "");
		hash.update(`${this.name || ""} `);
		this._modules.forEach(m => hash.update(m.hash));
	}

	canBeIntegrated(otherChunk) {
		if(otherChunk.isInitial()) {
			return false;
		}
		if(this.isInitial()) {
			if(otherChunk.getNumberOfParents() !== 1 || otherChunk.getParents()[0] !== this) {
				return false;
			}
		}
		return true;
	}

	addMultiplierAndOverhead(size, options) {
		const overhead = typeof options.chunkOverhead === "number" ? options.chunkOverhead : 10000;
		const multiplicator = this.isInitial() ? (options.entryChunkMultiplicator || 10) : 1;

		return size * multiplicator + overhead;
	}

	modulesSize() {
		return this._modules.getFromUnorderedCache(getModulesSize);
	}

	size(options) {
		return this.addMultiplierAndOverhead(this.modulesSize(), options);
	}

	integratedSize(otherChunk, options) {
		// Chunk if it's possible to integrate this chunk
		if(!this.canBeIntegrated(otherChunk)) {
			return false;
		}

		let integratedModulesSize = this.modulesSize();
		// only count modules that do not exist in this chunk!
		for(const otherModule of otherChunk._modules) {
			if(!this._modules.has(otherModule)) {
				integratedModulesSize += otherModule.size();
			}
		}

		return this.addMultiplierAndOverhead(integratedModulesSize, options);
	}

	sortModules(sortByFn) {
		this._modules.sortWith(sortByFn || sortById);
	}

	sortItems(sortChunks) {
		this.sortModules();
		this.origins.sort((a, b) => {
			const aIdent = a.module.identifier();
			const bIdent = b.module.identifier();
			if(aIdent < bIdent) return -1;
			if(aIdent > bIdent) return 1;
			return compareLocations(a.loc, b.loc);
		});
		this.origins.forEach(origin => {
			if(origin.reasons)
				origin.reasons.sort();
		});
		if(sortChunks) {
			this._parents.sort();
			this._chunks.sort();
		}
	}

	toString() {
		return `Chunk[${Array.from(this._modules).join()}]`;
	}
}

Object.defineProperty(Chunk.prototype, "modules", {
	configurable: false,
	get: util.deprecate(function() {
		return this._modules.getFromCache(getFrozenArray);
	}, "Chunk.modules is deprecated. Use Chunk.getNumberOfModules/mapModules/forEachModule/containsModule instead."),
	set: util.deprecate(function(value) {
		this.setModules(value);
	}, "Chunk.modules is deprecated. Use Chunk.addModule/removeModule instead.")
});

Object.defineProperty(Chunk.prototype, "chunks", {
	configurable: false,
	get() {
		throw new Error("Chunk.chunks: Use ChunkGroup.getChildren() instead");
	},
	set() {
		throw new Error("Chunk.chunks: Use ChunkGroup.add/removeChild() instead");
	}
});

Object.defineProperty(Chunk.prototype, "parents", {
	configurable: false,
	get() {
		throw new Error("Chunk.parents: Use ChunkGroup.getParents() instead");
	},
	set() {
		throw new Error("Chunk.parents: Use ChunkGroup.add/removeParent() instead");
	}
});

Object.defineProperty(Chunk.prototype, "blocks", {
	configurable: false,
	get() {
		throw new Error("Chunk.blocks: Use ChunkGroup.getBlocks() instead");
	},
	set() {
		throw new Error("Chunk.blocks: Use ChunkGroup.add/removeBlock() instead");
	}
});

Object.defineProperty(Chunk.prototype, "entrypoints", {
	configurable: false,
	get: util.deprecate(function() {
		return this._entrypoints.getFromCache(getFrozenArray);
	}, "Chunk.entrypoints: The ChunkGroup could now be instanceof Entrypoint"),
	set: util.deprecate(function(value) {
		this.setEntrypoints(value);
	}, "Chunk.entrypoints: The ChunkGroup could now be instanceof Entrypoint")
});

module.exports = Chunk;
