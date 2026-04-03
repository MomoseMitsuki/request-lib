import { EventEmitter, TaskQueue, Task } from "./utils";
import { useCacheStore } from "../request-store";
import SparkMD5 from "spark-md5";

export type RequestEvents = "beforeRequest" | "responseBody";
export type RequestMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
export interface ResponseLike {
	ok: boolean;
	status: number;
	headers?: Record<string, string>;
	json<T = any>(): Promise<T>;
	text(): Promise<string>;
	toPlain<T = any>(): Promise<T>;
}

export interface RequestOptions extends Partial<RequireOptions> {
	signal?: AbortSignal;
	credentials?: RequestCredentials;
}

export interface RequireOptions {
	params: Record<string, any>;
	headers: Record<string, string>;
	method: string;
	body: any;
}

export interface RequestConfig extends RequireOptions {
	url: string;
	pathname: string;
	cache: any;
}

type CacheOptions = {
	key: (config: RequestConfig) => string;
	persist: boolean;
	duration?: number;
	isValid?: (key: string, config: RequestConfig) => Promise<boolean>;
};

// 请求对象接口
export interface _Requestor extends EventEmitter<RequestEvents> {
	_request(url: string, method: RequestMethod, options?: RequestOptions): Promise<ResponseLike>;
	get(url: string, options?: RequestOptions): Promise<ResponseLike>;
	head(url: string, options?: RequestOptions): Promise<ResponseLike>;
	delete(url: string, options?: RequestOptions): Promise<ResponseLike>;
	options(url: string, options?: RequestOptions): Promise<ResponseLike>;
	post(url: string, options?: RequestOptions): Promise<ResponseLike>;
	put(url: string, options?: RequestOptions): Promise<ResponseLike>;
	patch(url: string, options?: RequestOptions): Promise<ResponseLike>;
	baseUrl: string;
}

export abstract class BaseRequestor extends EventEmitter<RequestEvents> implements _Requestor {
	abstract _request(url: string, method: RequestMethod, options?: RequestOptions): Promise<ResponseLike>;
	public get = (url: string, option?: RequestOptions) => this._request(url, "GET", option);
	public head = (url: string, option?: RequestOptions) => this._request(url, "HEAD", option);
	public delete = (url: string, option?: RequestOptions) => this._request(url, "DELETE", option);
	public options = (url: string, option?: RequestOptions) => this._request(url, "OPTIONS", option);
	public post = (url: string, option: RequestOptions = {}) => this._request(url, "POST", option);
	public put = (url: string, option: RequestOptions = {}) => this._request(url, "PUT", option);
	public patch = (url: string, option: RequestOptions = {}) => this._request(url, "PATCH", option);
	abstract baseUrl: string;
	constructor() {
		super();
	}
}

class WrapRequestor extends BaseRequestor {
	public baseUrl: string = useRequestor().baseUrl;
	constructor(private wrap: (request: _Requestor["_request"]) => _Requestor["_request"]) {
		super();
	}
	_request(url: string, method: RequestMethod, options?: RequestOptions): Promise<ResponseLike> {
		const req = useRequestor();
		return this.wrap(req._request.bind(this))(url, method, options);
	}
}

let req: _Requestor;

export function inject(requestor: _Requestor) {
	req = requestor;
}

export function useRequestor() {
	if (!req) {
		throw new Error("requestor is not injected");
	}
	return req;
}

/**
 * @maxCount 请求最大重试次数, 默认为5
 */
export function createRetryRequestor(maxCount = 5) {
	if (maxCount <= 0) {
		throw new Error("maxCount must greater than 0");
	}
	const wrap = (send: _Requestor["_request"]): _Requestor["_request"] => {
		return (url: string, method: RequestMethod, options?: RequestOptions) => {
			function retry(_maxCount: number): Promise<ResponseLike> {
				return send(url, method, options).catch(reason =>
					_maxCount <= 0 ? Promise.reject(reason) : retry(_maxCount - 1)
				);
			}
			return retry(maxCount);
		};
	};
	return new WrapRequestor(wrap);
}

/**
 * @timeout 响应超时时间设置, 默认3000
 */
export function createTimeoutRequestor(timeout = 3000) {
	if (timeout <= 0) {
		throw new Error("timeout must greater than 0");
	}
	const wrap = (send: _Requestor["_request"]): _Requestor["_request"] => {
		return (url: string, method: RequestMethod, options?: RequestOptions) => {
			const message = { message: "Request Timeout" };
			return new Promise<ResponseLike>((resolve, reject) => {
				const timeoutReject: ResponseLike = {
					ok: false,
					status: 408,
					headers: {},
					json: <T = typeof message>() => Promise.resolve(message) as T,
					text: () => Promise.resolve(JSON.stringify(message)),
					toPlain: <T = typeof message>() => Promise.resolve(message) as T
				};
				const timeoutId = setTimeout(() => {
					reject(timeoutReject);
				}, timeout);

				send(url, method, options)
					.then(response => {
						clearTimeout(timeoutId);
						resolve(response);
					})
					.catch(err => {
						clearTimeout(timeoutId);
						reject(err);
					});
			});
		};
	};
	return new WrapRequestor(wrap);
}

/**
 * @maxCount 最大并发请求数, 默认为4
 */
export function createParallelRequestor(maxCount = 4) {
	const taskQueue = new TaskQueue(maxCount);
	const wrap = (send: _Requestor["_request"]): _Requestor["_request"] => {
		return (url: string, method: RequestMethod, options?: RequestOptions) => {
			return new Promise<ResponseLike>((resolve, reject) => {
				const task = new Task(send, url, method, options);
				return taskQueue.add(task).then(resolve, reject);
			});
		};
	};
	return new WrapRequestor(wrap);
}

export function createSerialRequestor() {
	return createParallelRequestor(1);
}

export function createCacheRequestor(
	cacheOptions: CacheOptions = {
		key: config => config.pathname,
		duration: 3000,
		persist: false
	}
) {
	const options = normalizeOptions(cacheOptions);
	const store = useCacheStore(options.persist);
	const wrap = (send: _Requestor["_request"]): _Requestor["_request"] => {
		return (url: string, method: RequestMethod, options?: RequestOptions) => {
			return send(url, method, options);
		};
	};
	const req = new WrapRequestor(wrap);
	req.on("beforeRequest", async (config: RequestConfig) => {
		const key = options.key(config);
		const hadKey = await store.has(key);
		const isValid = await options.isValid(key, config);
		if (hadKey && isValid) {
			config.cache = await store.get(key);
		}
	});
	req.on("responseBody", async (config: RequestConfig, resp: ResponseLike) => {
		const key = options.key(config);
		const timeKey = `${key}#time`;
		const data = await resp.toPlain();
		await store.set(timeKey, Date.now());
		await store.set(key, data);
	});
	return req;
}

export function createIdempotentRequestor(genKey?: (config: RequestConfig) => string) {
	return createCacheRequestor({
		key: config => (genKey ? genKey(config) : hashRequest(config)),
		duration: 1000 * 60 * 60,
		persist: false
	});
}

export function createAbortableRequestor() {
	let controller: AbortController | null = null;
	const wrap = (send: _Requestor["_request"]): _Requestor["_request"] => {
		return (url: string, method: RequestMethod, options?: RequestOptions) => {
			controller?.abort();
			controller = new AbortController();
			return send(url, method, { ...options, signal: controller?.signal });
		};
	};
	return new WrapRequestor(wrap);
}

function hashRequest(config: RequestConfig) {
	const spark = new SparkMD5();
	spark.append(config.url);
	for (const [key, value] of Object.entries(config.headers)) {
		spark.append(key);
		spark.append(value);
	}
	for (const [key, value] of Object.entries(config.params)) {
		spark.append(key);
		spark.append(value);
	}
	spark.append(config.body);
	return spark.end();
}

function normalizeOptions(options: CacheOptions) {
	if (!options.isValid && options.duration) {
		options.isValid = async function (key: string) {
			const store = useCacheStore(options.persist);
			const timeKey = `${key}#time`;
			const start = await store.get<number | null>(timeKey);
			if (!start) {
				return false;
			}
			if (start + options.duration! < Date.now()) {
				await store.delete(key);
				await store.delete(timeKey);
				return false;
			} else {
				return true;
			}
		};
	}
	return options as Required<Pick<CacheOptions, "isValid">> & CacheOptions;
}
