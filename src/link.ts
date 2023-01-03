import { createWSClient, wsLink } from "@trpc/client";
import type { AnyRouter } from "@trpc/server";

import { createTrpcPortMessage, SOCKET_STATE } from "./shared.js";

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

interface SocketPonyFill extends SocketEssentials {}
function SocketPonyFill(this: SocketPonyFill, port: MessagePort) {
  const essentials: SocketEssentials = {
    ...SOCKET_STATE,
    readyState: SOCKET_STATE.OPEN,
    addEventListener: port.addEventListener.bind(port),
    removeEventListener: port.removeEventListener.bind(port),
    close: port.close.bind(port),
    send: port.postMessage.bind(port),
  };
  Object.assign(this, essentials);

  port.start();
  queueMicrotask(() => port.dispatchEvent(new Event("open")));
}

Object.assign(SocketPonyFill, SOCKET_STATE);

interface WorkerLike {
  postMessage(message: any, options: StructuredSerializeOptions): void;
}

interface WorkerLinkOptions {
  worker: WorkerLike;
}

function workerLink<TRouter extends AnyRouter>({ worker }: WorkerLinkOptions) {
  const { port1, port2 } = new MessageChannel();
  worker.postMessage(createTrpcPortMessage(port1), { transfer: [port1] });
  return wsLink<TRouter>({
    client: createWSClient({
      url: port2 as unknown as string,
      WebSocket: SocketPonyFill as unknown as typeof WebSocket,
    }),
  });
}

export { workerLink };
