import { describe, it, vi, expect, beforeEach, afterEach } from "vitest";
import {
	inject,
	useRequestor,
	createRetryRequestor,
	createTimeoutRequestor,
	createParallelRequestor,
	createSerialRequestor,
	createCacheRequestor,
	createIdempotentRequestor
} from "../../src/request-core";
import { Requestor } from "../../src/request-imp/request-fetch-imp";

inject(new Requestor("http://localhost:3000"));
const requestor = useRequestor();

describe("测试 基于 fetch 封装的 createRetryRequestor", () => {
	let mockRequest: any;
	beforeEach(() => {
		vi.restoreAllMocks();
		mockRequest = vi.spyOn(requestor, "_request");
	});

	it("测试错误的传参", () => {
		try {
			createRetryRequestor(0);
		} catch (e) {
			const error = e as Error;
			expect(error.message).toMatch("maxCount must greater than 0");
		}
	});

	it("测试最大5次请求, 失败3次的情况", async () => {
		const req = createRetryRequestor(5);
		const resp = await req.get("/api/retry/1");
		expect(mockRequest).toHaveBeenCalledTimes(4);
		expect(resp.ok).toBe(true);
		expect(resp.status).toBe(200);
	});

	it("测试最大3次请求, 一直失败的情况", async () => {
		const req = createRetryRequestor(3);
		await req.get("/api/server/error").catch(async resp => {
			expect(mockRequest).toHaveBeenCalledTimes(4);
			expect(resp.ok).toBe(false);
			expect(resp.status).toBe(500);
			await expect(resp.json()).resolves.toEqual({
				message: "server error"
			});
		});
	});
});

describe("测试 基于 fetch 封装的 createTimeoutRequestor", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("测试错误的传参", () => {
		try {
			createTimeoutRequestor(-3000);
		} catch (e) {
			const error = e as Error;
			expect(error.message).toMatch("timeout must greater than 0");
		}
	});

	it("测试未超时情况", async () => {
		const req = createTimeoutRequestor(5000);
		const resp = await req.get("/api/timeout");
		expect(resp.ok).toBe(true);
		expect(resp.status).toBe(200);
		await expect(resp.json()).resolves.toEqual({
			message: `timeout request success`
		});
	});

	it("测试超时情况", async () => {
		const req = createTimeoutRequestor(2000);
		req.get("/api/timeout").catch(resp => {
			expect(resp.ok).toBe(false);
			expect(resp.status).toBe(408);
		});
		vi.advanceTimersByTime(2000);
	});
});

describe("测试 基于 fetch 封装的 createParallelRequestor", () => {
	let mockRequest: any;
	beforeEach(() => {
		vi.restoreAllMocks();
		mockRequest = vi.spyOn(requestor, "_request");
	});

	it("测试未超出最大并发数", () => {
		const req = createParallelRequestor(3);
		for (let i = 0; i < 3; i++) {
			req.get("/api/get");
		}
		expect(mockRequest).toHaveBeenCalledTimes(3);
	});

	it("测试超出最大并发数", () => {
		const req = createParallelRequestor(4);
		for (let i = 0; i < 8; i++) {
			req.get("/api/get");
		}
		expect(mockRequest).toHaveBeenCalledTimes(4);
	});

	it("测试每轮并发是否能拿到自己的返回值", async () => {
		const req = createParallelRequestor(4);
		const methods = ["get", "post", "head", "patch", "put", "delete", "options"] as const;
		for (const method of methods) {
			req[method](`/api/${method}`).then(async resp => {
				expect(resp.ok).toBe(true);
				expect(resp.status).toBe(200);
				await expect(resp.json()).resolves.toEqual({
					message: `请求 ${method} 成功`
				});
			});
		}
		expect(mockRequest).toHaveBeenCalledTimes(4);
	});
});

describe("测试 基于 fetch 封装的 createSerialRequestor", () => {
	let mockRequest: any;
	beforeEach(() => {
		vi.restoreAllMocks();
		mockRequest = vi.spyOn(requestor, "_request");
	});
	it("测试串行功能是否正常", () => {
		const req = createSerialRequestor();
		req.get("/api/get").then(resp => {
			expect(resp.ok).toBe(true);
			expect(resp.status).toBe(200);
		});
		req.post("/api/post").then(resp => {
			expect(resp.ok).toBe(true);
			expect(resp.status).toBe(200);
		});
		req.put("/api/put").then(resp => {
			expect(resp.ok).toBe(true);
			expect(resp.status).toBe(200);
		});
		expect(mockRequest).toHaveBeenCalledTimes(1);
	});
});

describe("测试 基于 fetch 封装的 createCacheRequestor", () => {
	let mockRequest: any;
	const expectResult = {
		message: "请求 get 成功"
	};
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.useFakeTimers();
		sessionStorage.removeItem("/api/get");
		sessionStorage.removeItem("/api/get#time");
		mockRequest = vi.spyOn(requestor, "_request");
	});
	afterEach(() => {
		vi.useRealTimers();
	});
	it("测试缓存是否生效", async () => {
		const req = createCacheRequestor({
			key: config => config.pathname,
			duration: 3000,
			persist: false
		});
		const resp = await req.get("/api/get");

		expect(mockRequest).toHaveBeenCalledTimes(1);
		expect(resp.ok).toBe(true);
		expect(resp.status).toBe(200);
		expect(sessionStorage.getItem("/api/get")).toEqual(JSON.stringify(expectResult));
		expect(sessionStorage.getItem("/api/get#time")).toBeDefined();
		const cache = await req.get("/api/get");
		expect(cache.ok).toBe(true);
		expect(cache.status).toBe(304);
		expect(await cache.json()).toEqual(expectResult);
	});

	it("测试缓存过期重试", async () => {
		const req = createCacheRequestor({
			key: config => config.pathname,
			duration: 3000,
			persist: false
		});
		const resp = await req.get("/api/get");
		expect(resp.status).toBe(200);
		expect(await resp.json()).toEqual(expectResult);
		vi.advanceTimersByTime(3100);
		const new_resp = await req.get("/api/get");
		expect(new_resp.status).toBe(200);
	});
});

describe("测试 基于 fetch 封装的 createIdempotentRequestor", () => {
	let mockRequest: any;
	const expectResult = {
		message: "请求 post 成功"
	};
	beforeEach(() => {
		vi.restoreAllMocks();
		vi.useFakeTimers();
		sessionStorage.removeItem("/api/get");
		sessionStorage.removeItem("/api/get#time");
		mockRequest = vi.spyOn(requestor, "_request");
	});
	it("测试幂等性与缓存时效", async () => {
		const req = createIdempotentRequestor();
		const resp = await req.post("/api/post", {
			body: JSON.stringify(expectResult),
			headers: {
				"content-type": "application/json"
			},
			params: {
				a: 1,
				b: 2
			}
		});
		expect(mockRequest).toHaveBeenCalledOnce();
		expect(resp.ok).toBe(true);
		expect(resp.status).toBe(200);
		const cache = await req.post("/api/post", {
			body: JSON.stringify(expectResult),
			headers: {
				"content-type": "application/json"
			},
			params: {
				a: 1,
				b: 2
			}
		});
		expect(cache.ok).toBe(true);
		expect(cache.status).toBe(304);
		await expect(cache.json()).resolves.toEqual(expectResult);
		const noCache = await req.post("/api/post", {
			body: JSON.stringify(expectResult),
			headers: {
				"content-type": "application/json"
			},
			params: {
				a: 1,
				b: 3
			}
		});
		expect(noCache.status).toBe(200);
		vi.advanceTimersByTime(3601000);
		const n = await req.post("/api/post", {
			body: JSON.stringify(expectResult),
			headers: {
				"content-type": "application/json"
			},
			params: {
				a: 1,
				b: 2
			}
		});
		expect(n.status).toBe(200);
	});
});
