import { BaseSocketPonyFill, socketServer } from "./common.js";
import { isTrpcPortMessage } from "./shared.js";

class SocketPonyFill extends BaseSocketPonyFill {
	private port: MessagePort;
	constructor(port: MessagePort) {
		super();
		this.port = port;
		port.start();
	}

	on(
		event: "message" | "error",
		listener: (message: string | Error) => void,
	): this {
		this.port.addEventListener(event, (e) =>
			listener((e as MessageEvent).data),
		);
		return this;
	}
	once(event: "close", listener: (code: number) => void): this {
		this.port.addEventListener(
			event,
			(e) => listener((e as MessageEvent).data),
			{ once: true },
		);
		return this;
	}
	close(): void {
		this.port.close();
	}
	send(data: string): void {
		this.port.postMessage(data);
	}
}

interface WorkerLike {
	addEventListener(
		type: "message",
		listener: (ev: MessageEvent<any>) => any,
	): any;
}

function createWorkerServer({ worker }: { worker: WorkerLike }) {
	return socketServer((onConnection) => {
		worker.addEventListener("message", ({ data }) => {
			if (isTrpcPortMessage(data)) {
				onConnection(new SocketPonyFill(data[1]));
			}
		});
	});
}

export * from "./electron.js";
export { createWorkerServer };
// Internals
export {
	BaseSocketPonyFill as unstable_BaseSocketPonyFill,
	isTrpcPortMessage as unstable_isTrpcPortMessage,
	socketServer as unstable_socketServer,
};
