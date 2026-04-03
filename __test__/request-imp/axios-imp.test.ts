import { describe, it, expect, vi } from "vitest";
import { inject, useRequestor } from "../../src/request-core";
import { Requestor } from "../../src/request-imp/request-axios-imp";

inject(new Requestor("http://localhost:3000"));
const requestor = useRequestor();

describe("测试 axios 封装的Requestor基本功能", () => {
	const methods = ["get", "post", "head", "patch", "put", "delete", "options"] as const;
	for (const method of methods) {
		it(`测试 ${method} 普通请求`, async () => {
			const request = vi.fn((url: string) => requestor[method](url));
			const resp = await request(`/api/${method}`);
			expect(request).toHaveBeenCalledTimes(1);
			expect(resp.ok).toBe(true);
			expect(resp.status).toBe(200);
			await expect(resp.json()).resolves.toEqual({
				message: `请求 ${method} 成功`
			});
		});
	}
});

describe("测试 axios 封装的Requestor options功能", () => {
	it("测试携带 请求头", async () => {
		const resp = await requestor.get("/api/header", {
			headers: {
				auth_token: "mitsuki"
			}
		});
		expect(resp.ok).toBe(true);
		expect(resp.status).toBe(200);
		await expect(resp.json()).resolves.toEqual({
			message: "携带 header 成功"
		});
	});
	it("测试携带 cookie", async () => {
		document.cookie = "auth_token=mitsuki";
		const resp = await requestor.get("/api/cookie", {
			headers: {
				auth_token: "mitsuki"
			}
		});
		expect(resp.ok).toBe(true);
		expect(resp.status).toBe(200);
		await expect(resp.json()).resolves.toEqual({
			message: "携带 cookie 成功"
		});
		document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
		expect(document.cookie).toBe("");
	});
	it("测试携带 query 参数", async () => {
		const resp = await requestor.get("/api/query", {
			params: {
				params1: "hello world",
				params2: 2
			}
		});
		expect(resp.ok).toBe(true);
		expect(resp.status).toBe(200);
		await expect(resp.json()).resolves.toEqual({
			message: "携带 query 成功"
		});
	});

	it("测试携带 格式为 json 的 请求体", async () => {
		const body = JSON.stringify({
			data: "json",
			arr: [1, 2, 3, 4]
		});
		const resp = await requestor.post("/api/body/json", {
			body,
			headers: { "content-type": "application/json" }
		});
		expect(resp.ok).toBe(true);
		expect(resp.status).toBe(200);
		await expect(resp.json()).resolves.toEqual({
			message: "携带 json 格式的 请求体响应成功"
		});
	});

	it("测试携带 格式为 FormData 的 请求体", async () => {
		const body = new FormData();
		body.append("username", "mitsuki");
		body.append("password", "123456");
		const resp = await requestor.post("/api/body/formdata", {
			body
		});
		expect(resp.ok).toBe(true);
		expect(resp.status).toBe(200);
		await expect(resp.json()).resolves.toEqual({
			message: "携带 FormData 格式的 请求体响应成功"
		});
	});
});

describe("测试 axios 封装的Requestor 失败功能", () => {
	it("测试 client 401 错误是否能被捕获", () => {
		requestor.get("/api/client/error").catch(async resp => {
			expect(resp.ok).toBe(false);
			expect(resp.status).toBe(401);
			await expect(resp.json()).resolves.toEqual({
				message: "client error"
			});
		});
	});

	it("测试 server 500 错误是否能被捕获", () => {
		requestor.get("/api/server/error").catch(async resp => {
			expect(resp.ok).toBe(false);
			expect(resp.status).toBe(500);
			await expect(resp.json()).resolves.toEqual({
				message: "server error"
			});
		});
	});
});

describe("测试 EventEmitter 是否能正确触发", () => {
	it("测试 beforeRequest 事件", async () => {
		const mockListener = vi.fn(() => {});
		const mockOnceListener = vi.fn(() => {});
		requestor.on("beforeRequest", mockListener);
		requestor.once("beforeRequest", mockOnceListener);
		const options = {
			params: { a: 1 },
			headers: { b: "2" },
			body: { c: 3 }
		};
		const config = {
			...options,
			method: "POST",
			cached: void 0,
			pathname: "/api/post",
			url: "http://localhost:3000"
		};
		await requestor.post("/api/post", options);
		expect(mockListener).toHaveBeenCalledTimes(1);
		expect(mockOnceListener).toHaveBeenCalledTimes(1);
		expect(mockListener).toHaveBeenCalledWith(config);
		expect(mockOnceListener).toHaveBeenCalledExactlyOnceWith(config);
		await requestor.post("/api/post", options);
		expect(mockListener).toHaveBeenCalledTimes(2);
		expect(mockOnceListener).toHaveBeenCalledTimes(1);
		expect(mockListener).toHaveBeenCalledWith(config);
		expect(mockOnceListener).toHaveBeenCalledExactlyOnceWith(config);
		requestor.off("beforeRequest", mockListener);
		await requestor.post("/api/post", options);
		expect(mockListener).toHaveBeenCalledTimes(2);
		expect(mockOnceListener).toHaveBeenCalledTimes(1);
		expect(mockListener).toHaveBeenCalledWith(config);
		expect(mockOnceListener).toHaveBeenCalledExactlyOnceWith(config);
	});

	it("测试 responseBody 事件", async () => {
		const mockListener = vi.fn(() => {});
		const mockOnceListener = vi.fn(() => {});
		requestor.on("responseBody", mockListener);
		requestor.once("responseBody", mockOnceListener);
		const options = {
			params: { a: 1 },
			headers: { b: "2" },
			body: { c: 3 }
		};
		const config = {
			...options,
			method: "POST",
			cached: void 0,
			pathname: "/api/post",
			url: "http://localhost:3000"
		};
		const resp = await requestor.post("/api/post", options);
		expect(mockListener).toHaveBeenCalledTimes(1);
		expect(mockOnceListener).toHaveBeenCalledTimes(1);
		expect(mockListener).toHaveBeenCalledWith(config, resp);
		expect(mockOnceListener).toHaveBeenCalledExactlyOnceWith(config, resp);
		await requestor.post("/api/post", options);
		expect(mockListener).toHaveBeenCalledTimes(2);
		expect(mockOnceListener).toHaveBeenCalledTimes(1);
		expect(mockListener).toHaveBeenCalledWith(config, resp);
		expect(mockOnceListener).toHaveBeenCalledExactlyOnceWith(config, resp);
		requestor.off("responseBody", mockListener);
		await requestor.post("/api/post", options);
		expect(mockListener).toHaveBeenCalledTimes(2);
		expect(mockOnceListener).toHaveBeenCalledTimes(1);
		expect(mockListener).toHaveBeenCalledWith(config, resp);
		expect(mockOnceListener).toHaveBeenCalledExactlyOnceWith(config, resp);
	});
});
