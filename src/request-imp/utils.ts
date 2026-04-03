import type { ResponseLike } from "../request-core";

export function buildUrl(base: string, url: string, params?: Record<string, any>) {
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
	return fullUrl;
}

export function normalizeCache(data: any): ResponseLike {
	return {
		ok: true,
		status: 304,
		headers: {},
		json: async <T = any>() => {
			return data as T;
		},
		text: async () => {
			return JSON.stringify(data);
		},
		toPlain: async <T = any>() => {
			return data as T;
		}
	};
}
