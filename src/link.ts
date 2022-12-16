import type { AnyRouter } from "@trpc/server";
import { createWSClient, wsLink } from "@trpc/client";
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

class SocketPonyFill {
  constructor(port: MessagePort) {
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
}

Object.assign(SocketPonyFill, SOCKET_STATE);

interface MessagePortLinkOptions {
  port: MessagePort;
}

function messagePortLink<TRouter extends AnyRouter>(
  opts: MessagePortLinkOptions
) {
  return wsLink<TRouter>({
    client: createWSClient({
      url: opts.port as unknown as string,
      WebSocket: SocketPonyFill as unknown as typeof WebSocket,
    }),
  });
}

interface PostMessageInterface {
  postMessage(message: any, options: StructuredSerializeOptions): void;
}

interface WorkerLinkOptions {
  worker: PostMessageInterface;
}

function workerLink<TRouter extends AnyRouter>(opts: WorkerLinkOptions) {
  const { port1, port2 } = new MessageChannel();
  opts.worker.postMessage(createTrpcPortMessage(port1), { transfer: [port1] });
  return messagePortLink<TRouter>({ port: port2 });
}

export { messagePortLink, workerLink };
