import type { _Requestor, RequestMethod, RequestOptions, RequestConfig, ResponseLike } from "../request-core";
import { BaseRequestor } from "../request-core";
import { buildUrl, normalizeCache } from "./utils";

export class Requestor extends BaseRequestor implements _Requestor {
	constructor(public baseUrl: string = window.location.origin) {
		super();
	}
	public async _request(url: string, method: RequestMethod = "GET", options: RequestOptions = {}) {
		const requestInit = buildRequestInit(method, options);
		const urlObj = buildUrl(this.baseUrl, url, options.params);
		const config: RequestConfig = {
			params: options.params || {},
			headers: options.headers || {},
			method,
			body: options.body,
			url: urlObj.origin,
			pathname: urlObj.pathname,
			cache: void 0
		};
		const fullUrl = urlObj.toString();
		await this.emit("beforeRequest", config);
		if (config.cache) {
			const cache = normalizeCache(config.cache);
			return Promise.resolve(cache);
		}
		const result = await fetch(fullUrl, requestInit);
		const respLike = normalizeResponse(result);
		await this.emit("responseBody", config, respLike);
		if (respLike.ok) {
			return Promise.resolve(respLike);
		} else {
			return Promise.reject(respLike);
		}
	}
}

function buildRequestInit(method: string, option: RequestOptions): RequestInit {
	const requestInit: RequestInit = {
		...option,
		method,
		headers: option.headers || {},
		body: option.body
	};
	return requestInit;
}
function headersToObject(header: Headers): Record<string, string> {
	const result: Record<string, string> = {};
	header.forEach((value, key) => {
		result[key] = value;
	});
	return result;
}

function normalizeResponse(resp: Response): ResponseLike {
	return {
		ok: resp.ok,
		status: resp.status,
		headers: headersToObject(resp.headers),
		json: async <T = any>() => {
			const result = (await resp.clone().json()) as T;
			return result;
		},
		text: () => resp.clone().text(),
		toPlain: async <T = any>() => {
			const result = (await resp.clone().json()) as T;
			return result;
		}
	};
}
