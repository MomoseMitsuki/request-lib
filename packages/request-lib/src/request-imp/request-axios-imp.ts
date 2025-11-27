import axios from "axios";
import type { AxiosResponse, AxiosRequestConfig } from "axios";
import type { Requestor, RequestMethod } from "../request-core";
import { BaseRequestor } from "../request-core";
import type { RequestOptions, ResponseLike } from "../type";

class AxiosRequestor extends BaseRequestor implements Requestor {
	public baseUrl: string = window.location.origin;
	public async _request(url: string, method: RequestMethod, options: RequestOptions = {}): Promise<ResponseLike> {
		const requestConfig = this.buildRequestConfig(method, options);
		const fullUrl = this.buildUrl(this.baseUrl, url, options?.params);
		options.url = fullUrl;
		options.pathname = url;
		const resp = await axios.request(requestConfig);
		const respLike = this.normalizeResponse(resp);
		if (respLike.ok) {
			return Promise.resolve(respLike);
		} else {
			return Promise.reject(respLike);
		}
	}
	constructor() {
		super();
	}
	private buildUrl(base: string, url: string, params?: Record<string, any>) {
		const fullUrl = new URL(url, base);
		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				if (value == null) return;
				if (Array.isArray(value)) {
					value.forEach(item => fullUrl.searchParams.append(key, String(item)));
				} else {
					fullUrl.searchParams.set(key, String(value));
				}
			});
		}
		return fullUrl.toString();
	}
	private buildRequestConfig(method: RequestMethod, option: RequestOptions): AxiosRequestConfig {
		return {
			url: option.url || "",
			method,
			params: option.params,
			headers: option.headers || {},
			data: option.body
		};
	}
	private normalizeResponse(resp: AxiosResponse): ResponseLike {
		const data = resp.data;
		const ok = resp.status >= 200 && resp.status < 300;

		return {
			ok,
			status: resp.status,
			headers: this.headersToObject(resp.headers),
			json: async <T = any>() => data as Promise<T>,
			text: async () => (typeof data === "string" ? data : JSON.stringify(data)),
			toPlain: async <T = any>() => data as Promise<T>
		};
	}
	private headersToObject(header: AxiosResponse["headers"]): Record<string, string> {
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
}

export const requestor = new AxiosRequestor();
