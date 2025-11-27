import type { Requestor, RequestMethod } from "../request-core";
import { BaseRequestor } from "../request-core";
import type { RequestOptions, ResponseLike } from "../type";

class XhrRequestor extends BaseRequestor implements Requestor {
	public baseUrl: string = window.location.origin;
	public async _request(url: string, method: RequestMethod, options: RequestOptions = {}): Promise<ResponseLike> {
		const fullUrl = this.buildUrl(this.baseUrl, url, options.params);
		const respLike = new Promise<ResponseLike>((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open(method, fullUrl, true);
			const headers = options.headers || {};
			for (const [key, value] of Object.entries(headers)) {
				xhr.setRequestHeader(key, value);
			}
			xhr.onload = () => {
				const status = xhr.status === 1223 ? 204 : xhr.status;
				const rawText = xhr.responseText || "";
				const ok = status >= 200 && status < 300;

				const resp: ResponseLike = {
					ok,
					status,
					headers: this.headersToObject(xhr.getAllResponseHeaders()),
					json: async <T = any>() => {
						try {
							return JSON.parse(rawText) as T;
						} catch {
							return rawText as unknown as T;
						}
					},
					text: async () => rawText,
					toPlain: async <T = any>() => {
						try {
							return JSON.parse(rawText) as T;
						} catch {
							return rawText as unknown as T;
						}
					}
				};
				resolve(resp);
			};
			xhr.onerror = () => {
				reject(new Error("NetWork Error"));
			};
			xhr.send(options.body);
		});
		return respLike;
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
	private headersToObject(header: string): Record<string, string> {
		const result: Record<string, string> = {};
		if (!header) {
			return result;
		}
		header
			.trim()
			.split(/[\r\n]+/)
			.forEach(line => {
				const index = line.indexOf(":");
				if (index > 0) {
					const key = line.slice(0, index).trim();
					const value = line.slice(index + 1).trim();
					result[key] = value;
				}
			});
		return result;
	}
}

export const requestor = new XhrRequestor();
