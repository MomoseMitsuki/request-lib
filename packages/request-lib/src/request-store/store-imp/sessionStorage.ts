import type { CacheStore } from "../../type";

export const sessionStorageStore: CacheStore = {
	async get<T>(key: string): Promise<T> {
		const result = (await sessionStorage.getItem(key)) as string;
		return JSON.parse(result);
	},
	async set<T>(key: string, ...values: Array<T>): Promise<void> {
		if (values.length === 1) {
			sessionStorage.setItem(key, JSON.stringify(values[0]));
		} else {
			sessionStorage.setItem(key, JSON.stringify(values));
		}
	},
	async has(key: string): Promise<boolean> {
		for (const keys in sessionStorage) {
			if (keys === key) {
				return true;
			}
		}
		return false;
	},
	async delete(key: string): Promise<void> {
		return await sessionStorage.removeItem(key);
	},
	async clear() {
		return await sessionStorage.clear();
	}
};
