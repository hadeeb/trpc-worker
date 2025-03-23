import { type WebSocketClientOptions, createWSClient } from "@trpc/client";

import { SOCKET_STATE, createTrpcPortMessage } from "./shared.ts";

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
	constructor(worker: WorkerLike) {
		const { port1: port, port2 } = new MessageChannel();
		worker.postMessage(createTrpcPortMessage(port2), { transfer: [port2] });
		this.port = port;
		port.start();
	}
	addEventListener(event: string, listener: EventListener) {
		if (event === "open") {
			queueMicrotask(() => listener(new Event(event)));
			return;
		}
		return this.port.addEventListener(event, listener);
	}
	removeEventListener(event: string, listener: EventListener) {
		return this.port.removeEventListener(event, listener);
	}
	close() {
		return this.port.close();
	}
	send(message: any) {
		return this.port.postMessage(message);
	}
}

interface WorkerLike {
	postMessage(message: any, options: StructuredSerializeOptions): void;
}

interface WorkerClientOptions
	extends Omit<WebSocketClientOptions, "url" | "WebSocket"> {
	worker: WorkerLike;
}

function createWorkerClient({
	worker,
	...opts
}: WorkerClientOptions): ReturnType<typeof createWSClient> {
	return createWSClient({
		...opts,
		url: worker as unknown as string,
		WebSocket: SocketPonyFill as unknown as typeof WebSocket,
	});
}

export { createWorkerClient };
