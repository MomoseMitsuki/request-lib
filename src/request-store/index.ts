import { localStorageStore } from "./localStorage";
import { sessionStorageStore } from "./sessionStorage";

export interface CacheStore {
	has(key: string): Promise<boolean>;
	get<T>(key: string): Promise<T>;
	set<T>(key: string, ...values: Array<T>): Promise<void>;
	delete(key: string): Promise<void>;
	clear(): Promise<void>;
}

export function useCacheStore(isPersist: boolean): CacheStore {
	if (isPersist) {
		return createStorageStore();
	} else {
		return createMemoryStore();
	}
}

function createMemoryStore() {
	return sessionStorageStore;
}

function createStorageStore() {
	return localStorageStore;
}
