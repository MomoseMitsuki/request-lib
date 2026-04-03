import type { _Requestor, RequestMethod, RequestOptions, RequestConfig, ResponseLike } from "../request-core";
import { BaseRequestor } from "../request-core";
import { buildUrl, normalizeCache } from "./utils";

export class Requestor extends BaseRequestor implements _Requestor {
	constructor(public baseUrl: string = window.location.origin) {
		super();
	}
	public async _request(url: string, method: RequestMethod, options: RequestOptions = {}): Promise<ResponseLike> {
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

		const respLike = new Promise<ResponseLike>((resolve, reject) => {
			const xhr = new XMLHttpRequest();

			options.signal?.addEventListener("abort", () => {
				xhr.abort();
				reject(new DOMException("This operation was aborted", "AbortError"));
			});
			xhr.withCredentials = options.credentials === "include";

			xhr.open(method, fullUrl, true);

			const headers = options.headers || {};
			for (const [key, value] of Object.entries(headers)) {
				xhr.setRequestHeader(key, value);
			}
			xhr.onload = async () => {
				const status = xhr.status === 1223 ? 204 : xhr.status;
				const rawText = xhr.responseText || "";
				const ok = status >= 200 && status < 300;

				const respLike: ResponseLike = {
					ok,
					status,
					headers: headersToObject(xhr.getAllResponseHeaders()),
					json: async <T = any>() => {
						try {
							const result = JSON.parse(rawText) as T;
							return result;
						} catch {
							return rawText as unknown as T;
						}
					},
					text: async () => rawText,
					toPlain: async <T = any>() => {
						try {
							const result = JSON.parse(rawText) as T;
							return result;
						} catch {
							return rawText as unknown as T;
						}
					}
				};
				await this.emit("responseBody", config, respLike);
				if (respLike.ok) {
					resolve(respLike);
				} else {
					reject(respLike);
				}
			};

			xhr.onerror = () => {
				reject(new Error("NetWork Error"));
			};
			this.emit("beforeRequest", config).then(() => {
				if (config.cache) {
					const cache = normalizeCache(config.cache);
					resolve(cache);
				}
				xhr.send(options.body);
			});
		});
		return respLike;
	}
}

function headersToObject(header: string): Record<string, string> {
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
