import type { AnyRouter } from "@trpc/server";
import { createWSClient, wsLink } from "@trpc/client";
import {
  SOCKET_STATE,
  createWorkerMessage,
  Endpoint,
  isWorkerMessage,
} from "./shared.js";

type LinkOptions = { worker: Endpoint };

function workerLink<TRouter extends AnyRouter>({ worker }: LinkOptions) {
  interface SocketPonyFill
    extends Omit<WebSocket, "addEventListener" | "removeEventListener"> {
    listener: (e: MessageEvent<any>) => void;
  }

  class SocketPonyFill extends EventTarget {
    static CONNECTING = SOCKET_STATE.CONNECTING;
    static OPEN = SOCKET_STATE.OPEN;
    static CLOSING = SOCKET_STATE.CLOSING;
    static CLOSED = SOCKET_STATE.CLOSED;

    constructor() {
      super();

      Object.assign(this, SOCKET_STATE, { readyState: SOCKET_STATE.OPEN });

      this.listener = (e: MessageEvent<any>) => {
        if (isWorkerMessage(e.data)) {
          this.dispatchEvent(
            new MessageEvent("message", { data: e.data.data })
          );
        }
      };

      worker.addEventListener("message", this.listener);

      queueMicrotask(() => this.dispatchEvent(new Event("open")));
    }

    close() {
      this.dispatchEvent(new CloseEvent("close", { code: 0 }));
      worker.removeEventListener("message", this.listener);
    }

    send(data: string) {
      worker.postMessage(createWorkerMessage(data));
    }
  }

  return wsLink<TRouter>({
    client: createWSClient({ url: "", WebSocket: SocketPonyFill }),
  });
}

export { workerLink };
