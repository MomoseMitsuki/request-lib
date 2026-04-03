import axios from "axios";
import type { AxiosRequestConfig, AxiosResponse } from "axios";
import type { _Requestor, RequestMethod, RequestOptions, ResponseLike, RequestConfig } from "../request-core";
import { BaseRequestor } from "../request-core";
import { buildUrl, normalizeCache } from "./utils";

export class Requestor extends BaseRequestor implements _Requestor {
	constructor(public baseUrl: string = window.location.origin) {
		super();
	}
	public async _request(
		url: string,
		method: RequestMethod = "GET",
		options: RequestOptions = {}
	): Promise<ResponseLike> {
		const axiosConfig = buildRequestConfig(this.baseUrl, url, method, options);
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
		await this.emit("beforeRequest", config);
		if (config.cache) {
			const cache = normalizeCache(config.cache);
			return Promise.resolve(cache);
		}
		return await axios.request(axiosConfig).then(
			async resp => {
				const respLike = normalizeResponse(resp);
				await this.emit("responseBody", config, respLike);
				if (respLike.ok) {
					return Promise.resolve(respLike);
				} else {
					return Promise.reject(respLike);
				}
			},
			async err => {
				if (err.code === "ERR_CANCELED") {
					return Promise.reject(new DOMException("This operation was aborted", "AbortError"));
				}
				const respLike = normalizeResponse(err.response);
				return Promise.reject(respLike);
			}
		);
	}
}

function buildRequestConfig(
	baseURL: string,
	url: string,
	method: RequestMethod,
	option: RequestOptions
): AxiosRequestConfig {
	return {
		...option,
		baseURL,
		url,
		method,
		params: option.params,
		headers: option.headers || {},
		data: option.body,
		withCredentials: option.credentials === "include"
	};
}

function normalizeResponse(resp: AxiosResponse): ResponseLike {
	const data = resp.data;
	const ok = resp.status >= 200 && resp.status < 300;

	return {
		ok,
		status: resp.status,
		headers: headersToObject(resp.headers),
		json: async <T = any>() => data as Promise<T>,
		text: async () => (typeof data === "string" ? data : JSON.stringify(data)),
		toPlain: async <T = any>() => data as Promise<T>
	};
}

function headersToObject(header: AxiosResponse["headers"]): Record<string, string> {
	const result: Record<string, string> = {};
	if (!header) {
		return result;
	}
	Object.keys(header).forEach(key => {
		const value = header[key];
		if (Array.isArray(value)) {
			result[key] = value.join(", ");
		} else {
			result[key] = String(value);
		}
	});
	return result;
}
