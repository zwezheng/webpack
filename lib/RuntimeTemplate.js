/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const Template = require("./Template");

module.exports = class RuntimeTemplate {
	constructor(outputOptions, requestShortener) {
		this.outputOptions = outputOptions || {};
		this.requestShortener = requestShortener;
	}

	comment({ request, chunkName, chunkReason, message }) {
		let content;
		if(this.outputOptions.pathinfo) {
			content = [message, request, chunkName, chunkReason].filter(Boolean).map(item => this.requestShortener.shorten(item)).join(" | ");
		} else {
			content = [message, chunkName, chunkReason].filter(Boolean).map(item => this.requestShortener.shorten(item)).join(" | ");
		}
		if(!content) return "";
		if(this.outputOptions.pathinfo) {
			return Template.toComment(content);
		} else {
			return Template.toNormalComment(content);
		}
	}

	throwMissingModuleErrorFunction({ request }) {
		const err = `Cannot find module "${request}"`;
		return `function webpackMissingModule() { var e = new Error(${JSON.stringify(err)}); e.code = 'MODULE_NOT_FOUND'; throw e; }`;
	}

	missingModule({ request }) {
		return `!(${this.throwMissingModuleErrorFunction({ request })}())`;
	}

	missingModulePromise({ request }) {
		return `Promise.resolve().then(${this.throwMissingModuleErrorFunction({ request })})`;
	}

	moduleId({ module, request }) {
		if(!module) return this.missingModule({ request });
		return `${this.comment({ request })}${JSON.stringify(module.id)}`;
	}

	moduleExports({ module, request }) {
		if(!module) return this.missingModule({ request });
		return `__webpack_require__(${this.moduleId({ module, request })})`;
	}

	moduleNamespace({ module, request, strict }) {
		const stringifiedId = JSON.stringify(module.id);
		const comment = this.comment({ request });
		if(module.buildMeta && module.buildMeta.harmonyModule) {
			return `__webpack_require__(${comment}${stringifiedId})`;
		} else if(strict) {
			return `Object({ /* fake namespace object */ "default": __webpack_require__(${comment}${stringifiedId}) })`;
		} else {
			return `Object(function() { var module = __webpack_require__(${comment}${stringifiedId}); return typeof module === "object" && module && module.__esModule ? module : { /* fake namespace object */ "default": module }; }())`;
		}
	}

	moduleNamespacePromise({ block, module, request, message, strict, weak }) {
		if(!module) return this.missingModulePromise({ request });
		const promise = this.blockPromise({
			block,
			message
		});

		let getModuleFunction;
		let idExpr = JSON.stringify(module.id);
		const comment = this.comment({ request });
		let header = "";
		if(weak) {
			if(idExpr.length > 8) { // 'var x="nnnnnn";x,"+x+",x' vs '"nnnnnn",nnnnnn,"nnnnnn"'
				header += `var id = ${idExpr}; `;
				idExpr = "id";
			}
			header += `if(!__webpack_require__.m[${idExpr}]) { var e = new Error("Module '" + ${idExpr} + "' is not available (weak dependency)"); e.code = 'MODULE_NOT_FOUND'; throw e; } `;
		}
		if(module.buildMeta && module.buildMeta.harmonyModule) {
			if(header) {
				getModuleFunction = `function() { ${header}return __webpack_require__(${comment}${idExpr}); }`;
			} else {
				getModuleFunction = `__webpack_require__.bind(null, ${comment}${idExpr})`;
			}
		} else if(strict) {
			getModuleFunction = `function() { ${header}return { /* fake namespace object */ "default": __webpack_require__(${comment}${idExpr}) }; }`;
		} else {
			getModuleFunction = `function() { ${header}var module = __webpack_require__(${comment}${idExpr}); return typeof module === "object" && module && module.__esModule ? module : { /* fake namespace object */ "default": module }; }`;
		}

		return `${promise || "Promise.resolve()"}.then(${getModuleFunction})`;
	}

	blockPromise({ block, message }) {
		if(!block || !block.chunks) {
			const comment = this.comment({ message });
			return `Promise.resolve(${comment})`;
		}
		const chunks = block.chunks.filter(chunk => !chunk.hasRuntime() && chunk.id !== null);
		const comment = this.comment({
			message,
			chunkName: block.chunkName,
			chunkReason: block.chunkReason
		});
		if(chunks.length === 1) {
			const chunkId = JSON.stringify(chunks[0].id);
			return `__webpack_require__.e(${comment}${chunkId})`;
		} else if(chunks.length > 0) {
			const requireChunkId = chunk => `__webpack_require__.e(${JSON.stringify(chunk.id)})`;
			return `Promise.all(${comment}[${chunks.map(requireChunkId).join(", ")}])`;
		} else {
			return `Promise.resolve(${comment})`;
		}
	}

	onError() {
		return "__webpack_require__.oe";
	}

	defineEsModuleFlagStatement({ exportsArgument }) {
		return `__webpack_require__.r(${exportsArgument});\n`;
	}
};
