/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const DependencyReference = require("./DependencyReference");
const ModuleDependency = require("./ModuleDependency");
const UnsupportedWebAssemblyFeatureError = require("../wasm/UnsupportedWebAssemblyFeatureError");

/** @typedef {import("@webassemblyjs/ast").ModuleImportDescription} ModuleImportDescription */

class WebAssemblyImportDependency extends ModuleDependency {
	/**
	 * @param {string} request the request
	 * @param {string} name the imported name
	 * @param {ModuleImportDescription} description the WASM ast node
	 * @param {boolean} onlyDirectImport if only direct imports are allowed
	 */
	constructor(request, name, description, onlyDirectImport) {
		super(request);
		/** @type {string} */
		this.name = name;
		/** @type {ModuleImportDescription} */
		this.description = description;
		/** @type {boolean} */
		this.onlyDirectImport = onlyDirectImport;
	}

	getReference() {
		if (!this.module) return null;
		return new DependencyReference(this.module, [this.name], false);
	}

	getErrors() {
		if (
			this.onlyDirectImport &&
			this.module &&
			!this.module.type.startsWith("webassembly")
		) {
			const type = this.description.type;
			return [
				new UnsupportedWebAssemblyFeatureError(
					`${type} imports are only available for direct wasm to wasm dependencies`
				)
			];
		}
	}

	get type() {
		return "wasm import";
	}
}

module.exports = WebAssemblyImportDependency;
