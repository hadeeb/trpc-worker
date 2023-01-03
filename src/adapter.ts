import type { IpcMain, IpcRenderer } from "electron";
import type ws from "ws";

import { isTrpcPortMessage, SOCKET_STATE } from "./shared.js";

interface SocketServerEssentials {
  on(
    event: "connection",
    listener: (client: SocketEssentials, req: {}) => void
  ): void;
}

type Valueof<T> = T[keyof T];
type SocketStates = typeof SOCKET_STATE;

interface SocketEssentials extends SocketStates {
  readyState: Valueof<SocketStates>;
  on(
    event: "message" | "error",
    listener: (message?: string | Error) => void
  ): void;
  once(event: "close", listener: (code?: number) => void): void;
  send(data: string): void;
  close(code?: number | undefined): void;
}

function socketPonyFill(port: MessagePort): SocketEssentials {
  const on = (
    event: string,
    listener: Function,
    opts?: AddEventListenerOptions
  ): any =>
    port.addEventListener(
      event,
      (e) => listener((e as MessageEvent).data),
      opts
    );
  port.start();
  return {
    ...SOCKET_STATE,
    readyState: SOCKET_STATE.OPEN,
    on,
    once(event, listener) {
      on(event, listener, { once: true });
    },
    close() {
      port.close();
    },
    send(data) {
      port.postMessage(data);
    },
  };
}

function socketServer(
  init: (onConnection: (client: SocketEssentials) => void) => void
) {
  const server: SocketServerEssentials = {
    on(_event, cb) {
      init((client) => cb(client, {}));
    },
  };
  return server as unknown as ws.Server;
}

interface WorkerLike {
  addEventListener(
    type: "message",
    listener: (ev: MessageEvent<any>) => any
  ): any;
}

function createWorkerServer({ worker }: { worker: WorkerLike }) {
  return socketServer((onConnection) => {
    worker.addEventListener("message", ({ data }) => {
      if (isTrpcPortMessage(data)) {
        onConnection(socketPonyFill(data[1]));
      }
    });
  });
}

function createEletronServer({ ipcMain }: { ipcMain: IpcMain }) {
  return socketServer((onConnection) => {
    ipcMain.on("trpc-port", ({ ports: [port] }) => {
      if (!port) return;
      onConnection({
        ...SOCKET_STATE,
        readyState: SOCKET_STATE.OPEN,
        on(event, cb) {
          if (event === "message") {
            port.on(event, (e) => cb(e.data));
          }
        },
        once(event, cb) {
          port.once(event, cb);
        },
        send(data) {
          port.postMessage(data);
        },
        close() {
          port.close();
        },
      });
      port.start();
    });
  });
}

function trpcElectronPreload({ ipcRenderer }: { ipcRenderer: IpcRenderer }) {
  window.addEventListener("message", ({ data }) => {
    if (isTrpcPortMessage(data)) {
      ipcRenderer.postMessage("trpc-port", null, [data[1]]);
    }
  });
}

// Internals
export {
  socketServer as unstable_socketServer,
  socketPonyFill as unstable_socketPonyFill,
  isTrpcPortMessage as unstable_isTrpcPortMessage,
};
export { createEletronServer, createWorkerServer, trpcElectronPreload };
