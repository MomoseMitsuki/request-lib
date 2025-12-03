import { EventEmitter, TaskQueue, Task } from "./util";
import { localStorageStore, sessionStorageStore } from "../request-store";
import SparkMD5 from "spark-md5";
import type { RequestOptions, ResponseLike, CacheOptions } from "../type";

export type RequestEvents = "beforeRequest" | "responseBody";
export type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

// 请求对象接口
export interface Requestor extends EventEmitter<RequestEvents> {
	_request(url: string, method: RequestMethod, options?: RequestOptions): Promise<ResponseLike>;
	get(url: string, options?: RequestOptions): Promise<ResponseLike>;
	head(url: string, options?: RequestOptions): Promise<ResponseLike>;
	delete(url: string, options?: RequestOptions): Promise<ResponseLike>;
	options(url: string, options?: RequestOptions): Promise<ResponseLike>;
	post(url: string, data?: any, options?: RequestOptions): Promise<ResponseLike>;
	put(url: string, data?: any, options?: RequestOptions): Promise<ResponseLike>;
	patch(url: string, data?: any, options?: RequestOptions): Promise<ResponseLike>;
}

// 模板请求对象
export abstract class BaseRequestor extends EventEmitter<RequestEvents> implements Requestor {
	abstract _request(url: string, method: RequestMethod, options?: RequestOptions): Promise<ResponseLike>;
	public get = (url: string, option?: RequestOptions) => this._request(url, "GET", option);
	public head = (url: string, option?: RequestOptions) => this._request(url, "HEAD", option);
	public delete = (url: string, option?: RequestOptions) => this._request(url, "DELETE", option);
	public options = (url: string, option?: RequestOptions) => this._request(url, "OPTIONS", option);
	public post = (url: string, data?: any, option: RequestOptions = {}) =>
		this._request(url, "POST", { ...option, body: data });
	public put = (url: string, data?: any, option: RequestOptions = {}) =>
		this._request(url, "PUT", { ...option, body: data });
	public patch = (url: string, data?: any, option: RequestOptions = {}) =>
		this._request(url, "PATCH", { ...option, body: data });
	constructor() {
		super();
	}
}

let req: Requestor;

export function inject(requestor: Requestor) {
	req = requestor;
}

export function useRequestor() {
	return req;
}

// 适配器函数, 因为真实的请求都是发生在 _request 里面, 只需改动 _request 即可完成对 Requestor 对象的配置
function wrapRequestor(base: Requestor, wrap: (fn: Requestor["_request"]) => Requestor["_request"]): Requestor {
	class WrapRequestor extends BaseRequestor {
		public _request: Requestor["_request"];
		constructor() {
			super();
			this._request = (url: string, method: RequestMethod, option?: RequestOptions) => {
				return wrap(base._request.bind(base))(url, method, option);
			};
		}
	}
	return new WrapRequestor();
}

// 请求重试
export function createRetryRequestor(maxCount = 5) {
	const req = useRequestor();
	const wrap = (send: Requestor["_request"]) => {
		return async (url: string, method: RequestMethod, options?: RequestOptions) => {
			const retryRequest = async (count: number, send: Requestor["_request"]) => {
				return await send(url, method, options).catch(err => {
					count <= 0 ? Promise.reject(err) : retryRequest(count - 1, send);
				});
			};
			const resp = (await retryRequest(maxCount, send)) as ResponseLike;
			return resp;
		};
	};
	return wrapRequestor(req, wrap);
}

// 请求并发
export function createParallelRequestor(maxCount = 4) {
	const req = useRequestor();
	const wrap = (send: Requestor["_request"]) => {
		const taskQueue = new TaskQueue(maxCount);
		return async (url: string, method: RequestMethod, options?: RequestOptions) => {
			const requestTask = new Task(send, url, method, options);
			const resp = (await taskQueue.add(requestTask)) as Promise<ResponseLike>;
			return resp;
		};
	};
	return wrapRequestor(req, wrap);
}

// 请求缓存
export function createCacheRequestor(
	cacheOptions: CacheOptions = {
		duration: 1000 * 60 * 60,
		key: (config: RequestOptions) => config.pathname!,
		store: localStorageStore
	}
) {
	const options = normalizeOptions(cacheOptions);
	const store = options.store;
	const req = useRequestor();
	const wrap = (send: Requestor["_request"]) => {
		return async (url: string, method: RequestMethod, option: RequestOptions = {}) => {
			const req = newRequestor;
			option.pathname = url;
			const cached = await checkCache(option);
			// 捕获缓存
			if (cached) {
				return cached;
			}
			// 发送请求
			const resp = await send(url, method, option);
			// 设置缓存
			if (resp.ok) {
				req.emit("responseBody", option, resp);
			}
			return resp;
		};
	};
	const newRequestor = wrapRequestor(req, wrap);
	const checkCache = async (config: RequestOptions) => {
		const key = options.key(config);
		const dataKey = `${key}#data`;
		const hasKey = await store.has(dataKey);
		// todo: isValid 验证
		const isValid = await options.isValid(key, config);
		if (hasKey && isValid) {
			const cache = await store.get(dataKey);
			return cacheResponse(cache);
		}
	};
	newRequestor.on("responseBody", async (config: RequestOptions, resp: ResponseLike) => {
		const key = options.key(config);
		const dataKey = `${key}#data`;
		const timeKey = `${key}#time`;
		const data = await resp.toPlain();
		store.set(dataKey, data);
		store.set(timeKey, Date.now());
	});
	return newRequestor;
}

// 请求幂等
export function createIdempotentRequestor(genKey?: (config: RequestOptions) => string) {
	return createCacheRequestor({
		key: config => (genKey ? genKey(config) : hashRequest(config)),
		duration: 1000 * 60 * 60,
		store: sessionStorageStore
	});
}

// 请求串行
export function createSerialRequestor() {
	return createParallelRequestor(1);
}

function hashRequest(opt: RequestOptions) {
	const spark = new SparkMD5();
	if (opt.url) spark.append(opt.url);
	if (opt.headers) {
		const keys = Object.keys(opt.headers);
		for (const key of keys) {
			spark.append(key);
			spark.append(opt.headers[key]!);
		}
	}
	if (opt.body) spark.append(opt.body);
	return spark.end();
}

function normalizeOptions(cacheOptions: CacheOptions): Required<CacheOptions> {
	if (!cacheOptions.isValid) {
		const isValid = async (key: string) => {
			const stores = cacheOptions.store;
			const dataKey = `${key}#data`;
			const timeKey = `${key}#time`;
			const start = (await stores.get(timeKey)) as number;
			if (!start) {
				return false;
			}
			if (cacheOptions.duration + start < Date.now()) {
				// 超出时间, 清理缓存
				await stores.delete(dataKey);
				await stores.delete(timeKey);
				return false;
			} else {
				return true;
			}
		};
		cacheOptions.isValid = isValid;
	}
	return cacheOptions as Required<CacheOptions>;
}

function cacheResponse(data: any, status = 299): ResponseLike {
	return {
		ok: true,
		status,
		json: () => data,
		toPlain: () => data,
		text: async () => JSON.stringify(data)
	};
}
