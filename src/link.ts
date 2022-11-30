import type { AnyRouter } from "@trpc/server";
import { createWSClient, wsLink } from "@trpc/client";
import { createWorkerMessage, Endpoint, isWorkerMessage } from "./shared.js";

type LinkOptions = { worker: Endpoint };

function workerLink<TRouter extends AnyRouter>({ worker }: LinkOptions) {
  interface SocketPonyFill {
    listener: (e: MessageEvent<any>) => void;
  }
  class SocketPonyFill extends EventTarget {
    constructor() {
      super();

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

    send(data: string) {
      worker.postMessage(createWorkerMessage(data));
    }
    close() {
      this.dispatchEvent(new CloseEvent("close", { code: 0 }));
      worker.removeEventListener("message", this.listener);
    }
  }

  return wsLink<TRouter>({
    client: createWSClient({ url: "", WebSocket: SocketPonyFill as any }),
  });
}

export { workerLink };
