import type { IncomingMessage } from "node:http";
import type { WebSocketServer } from "ws";

import { SOCKET_STATE } from "./shared.ts";

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
	abstract once(event: "close", listener: () => void): this;
	abstract close(): void;
	abstract send(data: string): void;
}

function socketServer(
	init: (onConnection: (client: BaseSocketPonyFill) => void) => void,
) {
	const server = {
		on(
			_event: "connection",
			listener: (client: BaseSocketPonyFill, req: IncomingMessage) => void,
		): void {
			init((client) => listener(client, { headers: {} } as IncomingMessage));
		},
	};
	return server as unknown as WebSocketServer;
}

export { BaseSocketPonyFill, socketServer };
