import type { IpcMain, IpcRenderer, MessagePortMain } from "electron";

import { BaseSocketPonyFill, socketServer } from "./common";
import { isTrpcPortMessage } from "./shared";

class ElectronSocketPonyFill extends BaseSocketPonyFill {
	private port: MessagePortMain;
	constructor(port: MessagePortMain) {
		super();
		this.port = port;
		port.start();
	}

	on(event: "message" | "error", cb: (message: string | Error) => void): this {
		if (event === "message") {
			this.port.on(event, (e) => cb(e.data));
		}
		return this;
	}
	once(event: "close", cb: (code: number) => void): this {
		this.port.once(event, cb);
		return this;
	}
	close(): void {
		this.port.close();
	}
	send(data: string): void {
		this.port.postMessage(data);
	}
}

function createElectronServer({ ipcMain }: { ipcMain: IpcMain }) {
	return socketServer((onConnection) => {
		ipcMain.on("trpc-port", ({ ports: [port] }) => {
			if (!port) return;
			onConnection(new ElectronSocketPonyFill(port));
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
export { createElectronServer, trpcElectronPreload };
