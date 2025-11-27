export interface ResponseLike {
	ok: boolean;
	status: number;
	headers?: Record<string, string>;
	json<T = any>(): Promise<T>;
	text(): Promise<string>;
	toPlain<T = any>(): Promise<T>;
}

export interface RequestOptions {
	params?: Record<string, any>;
	headers?: Record<string, string>;
	pathname?: string;
	url?: string;
	method?: string;
	body?: any;
}

export interface CacheStore {
	has(key: string): Promise<boolean>;
	get<T>(key: string): Promise<T>;
	set<T>(key: string, ...values: Array<T>): Promise<void>;
	delete(key: string): Promise<void>;
	clear(): Promise<void>;
}

export interface CacheOptions {
	duration: number;
	store: CacheStore;
	key: (config: RequestOptions) => string;
	isValid?: (key: string, config: RequestOptions) => Promise<boolean>;
}
