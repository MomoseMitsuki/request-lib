import type { CacheStore } from "../../type";

class MapCacheStore implements CacheStore {
	private map = new Map<string, unknown>();
	async has(key: string): Promise<boolean> {
		return this.map.has(key);
	}

	async get<T>(key: string): Promise<T> {
		if (!this.map.has(key)) {
			throw new Error(`Key "${key}" not found`);
		}
		return this.map.get(key) as T;
	}

	async set<T>(key: string, ...values: Array<T>): Promise<void> {
		if (values.length === 1) {
			this.map.set(key, values[0]);
		} else {
			this.map.set(key, values);
		}
	}

	async delete(key: string): Promise<void> {
		this.map.delete(key);
	}

	async clear(): Promise<void> {
		this.map.clear();
	}
}

export const MemoryStore: CacheStore = new MapCacheStore();
