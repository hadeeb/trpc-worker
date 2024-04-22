import { createWSClient } from "@trpc/client";

import { SOCKET_STATE, createTrpcPortMessage } from "./shared.js";

type SocketEssentials = Pick<
	WebSocket,
	| "addEventListener"
	| "removeEventListener"
	| "close"
	| "send"
	| "readyState"
	| "CLOSED"
	| "CLOSING"
	| "CONNECTING"
	| "OPEN"
>;

class SocketPonyFill implements SocketEssentials {
	static CONNECTING = SOCKET_STATE.CONNECTING;
	static OPEN = SOCKET_STATE.OPEN;
	static CLOSING = SOCKET_STATE.CLOSING;
	static CLOSED = SOCKET_STATE.CLOSED;

	readonly readyState = SOCKET_STATE.OPEN;
	readonly CONNECTING = SOCKET_STATE.CONNECTING;
	readonly OPEN = SOCKET_STATE.OPEN;
	readonly CLOSING = SOCKET_STATE.CLOSING;
	readonly CLOSED = SOCKET_STATE.CLOSED;

	private port: MessagePort;
	constructor(port: MessagePort) {
		this.port = port;
		port.start();
		queueMicrotask(() => port.dispatchEvent(new Event("open")));
	}
	addEventListener(...args: Parameters<MessagePort["addEventListener"]>) {
		return this.port.addEventListener(...args);
	}
	removeEventListener(...args: Parameters<MessagePort["removeEventListener"]>) {
		return this.port.removeEventListener(...args);
	}
	close() {
		return this.port.close();
	}
	send(...args: Parameters<MessagePort["postMessage"]>) {
		return this.port.postMessage(...args);
	}
}

interface WorkerLike {
	postMessage(message: any, options: StructuredSerializeOptions): void;
}

interface WorkerClientOptions {
	worker: WorkerLike;
}

function createWorkerClient({
	worker,
}: WorkerClientOptions): ReturnType<typeof createWSClient> {
	const { port1, port2 } = new MessageChannel();
	worker.postMessage(createTrpcPortMessage(port1), { transfer: [port1] });
	return createWSClient({
		url: port2 as unknown as string,
		WebSocket: SocketPonyFill as unknown as typeof WebSocket,
	});
}

export { createWorkerClient };
