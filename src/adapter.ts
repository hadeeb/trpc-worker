import type { AnyRouter, inferRouterContext } from "@trpc/server";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import {
  SOCKET_STATE,
  createWorkerMessage,
  Endpoint,
  isWorkerMessage,
} from "./shared.js";

function applyWorkerHandler<TRouter extends AnyRouter>({
  router,
  createContext,
  worker = self,
}: TRPCWorkerOptions<TRouter>) {
  class SocketClientPonyFill extends EventTarget {
    constructor() {
      super();
      Object.assign(this, SOCKET_STATE, {
        readyState: SOCKET_STATE.OPEN,
      });
    }
    on(
      type: string,
      callback: (data: any) => void,
      opts?: AddEventListenerOptions
    ) {
      this.addEventListener(
        `custom-${type}`,
        (e) => callback((e as MessageEvent<any>).data),
        opts
      );
    }
    once(type: string, callback: (data: any) => void) {
      this.on(type, callback, { once: true });
    }
    send(data: string) {
      worker.postMessage(createWorkerMessage(data));
    }
    emit(type: string, data?: any) {
      // CustomEvent not in node LTS yet
      this.dispatchEvent(new MessageEvent(`custom-${type}`, { data }));
    }
    close() {
      this.emit("close");
    }
  }

  applyWSSHandler({
    router,
    createContext: () => createContext(),
    wss: {
      on(_1: string, cb: (client: SocketClientPonyFill, req: any) => void) {
        const client = new SocketClientPonyFill();

        worker.addEventListener("message", (e) => {
          if (isWorkerMessage(e.data)) {
            client.emit("message", e.data.data);
          }
        });

        cb(client, {});
      },
    } as any,
  });
}

type TRPCWorkerOptions<TRouter extends AnyRouter> = {
  router: TRouter;
  createContext: () => Promise<inferRouterContext<TRouter>>;
  worker?: Endpoint;
};

export { applyWorkerHandler };
