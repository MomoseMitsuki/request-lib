export class EventEmitter<T extends string> {
	public events: Map<T, Set<Function>>;
	constructor() {
		this.events = new Map();
	}
	on(event: T, listener: Function) {
		if (!this.events.has(event)) {
			this.events.set(event, new Set());
		}
		this.events.get(event)!.add(listener);
	}
	async emit(event: T, ...args: any[]) {
		if (!this.events.has(event)) {
			return;
		}
		for (const listener of this.events.get(event)!) {
			await listener(...args);
		}
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
}

type Func = (...args: any) => any;

export class Task<T extends Func> {
	fn: T;
	payload: Parameters<T>;
	constructor(fn: T, ...payload: Parameters<T>) {
		this.fn = fn;
		this.payload = payload;
	}
	async run() {
		return await this.fn(...this.payload);
	}
}

interface TaskExecutor<T extends Func> {
	task: Task<T>;
	resolve: (value: ReturnType<T>) => void;
	reject: (reason: ReturnType<T> | Error) => void;
}

export class TaskQueue {
	private tasks: Array<TaskExecutor<Func>> = [];
	private runningCount = 0;
	private concurrency: number = 4;
	constructor(concurrency: number = 4) {
		this.concurrency = concurrency;
	}
	add<T extends Func>(task: Task<T>) {
		return new Promise<ReturnType<T>>((resolve, reject) => {
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
