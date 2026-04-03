import { http, HttpHandler, HttpResponse } from "msw";
import { SuccessMessage, OptionMessage, ErrorMessage, CoreMessage } from "./message";
const base_url = "http://localhost:3000";

enum STATUS {
	SUCCESS = 200,
	CLIENT_ERROR = 401,
	SERVER_ERROR = 500
}

const normalHandlers: Array<HttpHandler> = [
	http.get(`${base_url}/api/get`, () => {
		return HttpResponse.json(SuccessMessage.GET, { status: STATUS.SUCCESS });
	}),
	http.post(`${base_url}/api/post`, () => {
		return HttpResponse.json(SuccessMessage.POST, { status: STATUS.SUCCESS });
	}),
	http.put(`${base_url}/api/put`, () => {
		return HttpResponse.json(SuccessMessage.PUT, { status: STATUS.SUCCESS });
	}),
	http.delete(`${base_url}/api/delete`, () => {
		return HttpResponse.json(SuccessMessage.DELETE, { status: STATUS.SUCCESS });
	}),
	http.head(`${base_url}/api/head`, () => {
		return HttpResponse.json(SuccessMessage.HEAD, { status: STATUS.SUCCESS });
	}),
	http.patch(`${base_url}/api/patch`, () => {
		return HttpResponse.json(SuccessMessage.PATCH, { status: STATUS.SUCCESS });
	}),
	http.options(`${base_url}/api/options`, () => {
		return HttpResponse.json(SuccessMessage.OPTIONS, { status: STATUS.SUCCESS });
	})
];

const optionHandlers: Array<HttpHandler> = [
	http.get(`${base_url}/api/header`, ({ request }) => {
		const token = request.headers.get("auth_token");
		if (token === "mitsuki") {
			return HttpResponse.json(OptionMessage.HEADER, { status: STATUS.SUCCESS });
		}
		return HttpResponse.json();
	}),
	http.get(`${base_url}/api/cookie`, ({ cookies }) => {
		if (cookies["auth_token"] === "mitsuki") {
			return HttpResponse.json(OptionMessage.COOKIE, { status: STATUS.SUCCESS });
		}
		return HttpResponse.json();
	}),
	http.get(`${base_url}/api/query`, ({ request }) => {
		const params = new URL(request.url).searchParams;
		const param1 = params.get("params1");
		const param2 = params.get("params2");
		if (param1 === "hello world" && Number(param2) === 2) {
			return HttpResponse.json(OptionMessage.QUERY, { status: STATUS.SUCCESS });
		}
		return HttpResponse.error();
	}),
	http.post(`${base_url}/api/body/json`, async ({ request }) => {
		const body = (await request.json()) as any;
		if (body.data === "json" && body.arr.length === 4) {
			return HttpResponse.json(OptionMessage.BODY_JSON, { status: STATUS.SUCCESS });
		}
		return HttpResponse.error();
	}),
	http.post(`${base_url}/api/body/formdata`, async ({ request }) => {
		const body = await request.formData();
		const username = body.get("username");
		const password = body.get("password");
		if (username === "mitsuki" && password === "123456") {
			return HttpResponse.json(OptionMessage.BODY_FORMDATA, { status: STATUS.SUCCESS });
		}
		return HttpResponse.error();
	})
];

const errorHandlers: Array<HttpHandler> = [
	http.get(`${base_url}/api/client/error`, () => {
		return HttpResponse.json(ErrorMessage.CLIENT, { status: STATUS.CLIENT_ERROR });
	}),
	http.get(`${base_url}/api/server/error`, () => {
		return HttpResponse.json(ErrorMessage.SERVER, { status: STATUS.SERVER_ERROR });
	})
];
let retryCount1 = 0;
const coreHandlers: Array<HttpHandler> = [
	http.get(`${base_url}/api/retry/1`, () => {
		if (retryCount1 < 3) {
			retryCount1++;
			return HttpResponse.json(ErrorMessage.SERVER, { status: STATUS.SERVER_ERROR });
		}
		retryCount1 = 0;
		return HttpResponse.json(CoreMessage.RETRY, { status: STATUS.SUCCESS });
	}),
	http.get(`${base_url}/api/timeout`, async () => {
		return HttpResponse.json(CoreMessage.TIMEOUT, { status: STATUS.SUCCESS });
	})
];
export default [...normalHandlers, ...optionHandlers, ...errorHandlers, ...coreHandlers];
