import type { Requestor, RequestMethod } from "../request-core";
import { BaseRequestor } from "../request-core";
import type { RequestOptions, ResponseLike } from "../type";
class FetchRequestor extends BaseRequestor implements Requestor {
	public baseUrl: string = window.location.origin;
	constructor() {
		super();
	}
	public async _request(url: string, method: RequestMethod = "GET", options: RequestOptions = {}) {
		// 正式发出请求
		const requestInit = this.buildRequestInit(method, options);
		const fullUrl = this.buildUrl(this.baseUrl, url, options.params);
		options.url = fullUrl;
		options.pathname = url;
		const result = await fetch(this.baseUrl + url, requestInit);
		const respLike = this.normalizeResponse(result);
		if (respLike.ok) {
			return Promise.resolve(respLike);
		} else {
			return Promise.reject(respLike);
		}
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
	// 构建原生 Fetch Api 的配置
	private buildRequestInit(method: string, option: RequestOptions): RequestInit {
		const requestInit: RequestInit = {
			method,
			headers: option.headers || {},
			body: option.body
		};
		return requestInit;
	}
	// 参数归一化, 统一响应结果
	private normalizeResponse(resp: Response): ResponseLike {
		return {
			ok: resp.ok,
			status: resp.status,
			headers: this.headersToObject(resp.headers),
			json: <T = any>() => resp.clone().json() as Promise<T>,
			text: () => resp.clone().text(),
			toPlain: <T = any>() => resp.clone().json() as Promise<T>
		};
	}

	private headersToObject(header: Headers): Record<string, string> {
		const result: Record<string, string> = {};
		header.forEach((value, key) => {
			result[key] = value;
		});
		return result;
	}
}

export const requestor = new FetchRequestor();
