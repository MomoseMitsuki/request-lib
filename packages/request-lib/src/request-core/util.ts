export class EventEmitter<T extends string> {
	private events: Map<T, Set<Function>>;
	constructor() {
		this.events = new Map();
	}
	on(event: T, listener: Function) {
		if (!this.events.has(event)) {
			this.events.set(event, new Set());
		}
		this.events.get(event)!.add(listener);
	}
	emit(event: T, ...args: any[]) {
		if (!this.events.has(event)) {
			return;
		}
		this.events.get(event)!.forEach(listener => {
			listener(...args);
		});
	}
	off(event: T, listener: Function) {
		if (!this.events.has(event)) {
			return;
		}
		this.events.get(event)!.delete(listener);
	}
	once(event: T, listener: Function) {
		const onceListener = (...args: any[]) => {
			listener(...args);
			this.off(event, onceListener);
		};
		this.on(event, onceListener);
	}
	async emitAsync(event: T, ...args: any[]) {
		if (!this.events.has(event)) {
			return;
		}
		const listeners = this.events.get(event)!;
		for (const listener of listeners) {
			const result = await listener(...args);
			if (result !== void 0 && result !== null) {
				return result;
			}
		}
		return void 0;
	}
}

export class Task {
	fn: Function;
	payload: any[];
	constructor(fn: Function, ...payload: any[]) {
		this.fn = fn;
		this.payload = payload;
	}
	async run() {
		return this.fn(...this.payload);
	}
}

interface AsyncTask {
	task: Task;
	resolve: (value: unknown) => void;
	reject: (reason?: unknown) => void;
}

export class TaskQueue {
	private tasks: Array<AsyncTask> = [];
	private runningCount = 0;
	private concurrency: number = 4;
	constructor(concurrency: number = 4) {
		this.concurrency = concurrency;
	}
	add(task: Task) {
		return new Promise((resolve, reject) => {
			this.tasks.push({ task, resolve, reject });
			this.run();
		});
	}
	run() {
		while (this.runningCount < this.concurrency && this.tasks.length !== 0) {
			const { task, resolve, reject } = this.tasks.shift()!;
			this.runningCount++;
			task.run()
				.then(
					data => resolve(data),
					err => reject(err)
				)
				.finally(() => {
					this.runningCount--;
					this.run();
				});
		}
	}
}
