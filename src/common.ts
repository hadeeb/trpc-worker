import type { WebSocketServer } from "ws";

import { SOCKET_STATE } from "./shared.js";

abstract class BaseSocketPonyFill {
	readonly readyState = SOCKET_STATE.OPEN;
	readonly CONNECTING = SOCKET_STATE.CONNECTING;
	readonly OPEN = SOCKET_STATE.OPEN;
	readonly CLOSING = SOCKET_STATE.CLOSING;
	readonly CLOSED = SOCKET_STATE.CLOSED;

	abstract on(
		event: "message" | "error",
		listener: (message: string | Error) => void,
	): this;
	abstract once(event: "close", listener: (code: number) => void): this;
	abstract close(): void;
	abstract send(data: string): void;
}

function socketServer(
	init: (onConnection: (client: BaseSocketPonyFill) => void) => void,
) {
	const server = {
		on(
			_event: "connection",
			listener: (client: BaseSocketPonyFill, req: any) => void,
		): void {
			init((client) => listener(client, {}));
		},
	};
	return server as unknown as WebSocketServer;
}

export { BaseSocketPonyFill, socketServer };
