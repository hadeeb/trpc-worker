import type { AnyRouter, inferRouterContext } from "@trpc/server";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import type { IpcMain, IpcRenderer } from "electron";

import { isTrpcPortMessage, SOCKET_STATE } from "./shared.js";

type SocketPort = Pick<
  MessagePort,
  "addEventListener" | "postMessage" | "close"
>;

class SocketClientPonyFill extends EventTarget {
  port: SocketPort;
  constructor(port: SocketPort) {
    super();
    Object.assign(this, SOCKET_STATE, {
      readyState: SOCKET_STATE.OPEN,
      port,
    });
    port.addEventListener("message", (e) => {
      this.emit("message", e.data);
    });
    port.addEventListener("close", () => {
      this.close();
    });
  }
  on(
    type: string,
    callback: (data: any) => void,
    opts?: AddEventListenerOptions
  ) {
    this.addEventListener(
      `custom-${type}`,
      (e: MessageEvent<any>) => callback(e.data),
      opts
    );
  }
  once(type: string, callback: (data: any) => void) {
    this.on(type, callback, { once: true });
  }
  send(data: string) {
    this.port.postMessage(data);
  }
  emit(type: string, data?: any) {
    // CustomEvent not in node LTS yet
    this.dispatchEvent(new MessageEvent(`custom-${type}`, { data }));
  }
  close() {
    this.port.close();
    this.emit("close");
  }
}

interface TRPCHandlerOptions<TRouter extends AnyRouter> {
  router: TRouter;
  createContext: () => Promise<inferRouterContext<TRouter>>;
}

type TRPCMessagePortOptions<TRouter extends AnyRouter> =
  TRPCHandlerOptions<TRouter> & { port: SocketPort };

function applyMessagePortHandler<TRouter extends AnyRouter>({
  router,
  createContext,
  port,
}: TRPCMessagePortOptions<TRouter>) {
  applyWSSHandler({
    router,
    createContext: () => createContext(),
    wss: {
      on(_1: string, cb: (client: SocketClientPonyFill, req: any) => void) {
        const client = new SocketClientPonyFill(port);
        cb(client, {});
      },
    } as any,
  });
}

interface PostMessageInterface {
  addEventListener(
    type: "message",
    listener: (ev: MessageEvent<any>) => any
  ): void;
}
type TRPCWorkerOptions<TRouter extends AnyRouter> =
  TRPCHandlerOptions<TRouter> & {
    worker?: PostMessageInterface;
  };

function applyWorkerHandler<TRouter extends AnyRouter>({
  router,
  createContext,
  worker = self,
}: TRPCWorkerOptions<TRouter>) {
  applyWSSHandler({
    router,
    createContext: () => createContext(),
    wss: {
      on(_1: string, cb: (client: SocketClientPonyFill, req: any) => void) {
        worker.addEventListener("message", ({ data }) => {
          if (isTrpcPortMessage(data)) {
            const client = new SocketClientPonyFill(data[1]);
            cb(client, {});
          }
        });
      },
    } as any,
  });
}

type TRPCElectronOptions<TRouter extends AnyRouter> =
  TRPCHandlerOptions<TRouter> & { ipcMain: IpcMain };

function applyElectronHandler<TRouter extends AnyRouter>({
  router,
  createContext,
  ipcMain,
}: TRPCElectronOptions<TRouter>) {
  applyWSSHandler({
    router,
    createContext: () => createContext(),
    wss: {
      on(_1: string, cb: (client: SocketClientPonyFill, req: any) => void) {
        ipcMain.on("trpc-port", ({ ports: [port] }) => {
          const client = new SocketClientPonyFill({
            addEventListener: port.addListener.bind(port),
            postMessage: port.postMessage.bind(port),
            close: port.close.bind(port),
          });

          cb(client, {});
          port.start();
        });
      },
    } as any,
  });
}

function trpcElectronPreload({ ipcRenderer }: { ipcRenderer: IpcRenderer }) {
  window.addEventListener("message", ({ data }) => {
    if (isTrpcPortMessage(data)) {
      ipcRenderer.postMessage("trpc-port", null, [data[1]]);
    }
  });
}

export {
  applyElectronHandler,
  applyMessagePortHandler,
  applyWorkerHandler,
  trpcElectronPreload,
};
