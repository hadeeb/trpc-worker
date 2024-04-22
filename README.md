# tRPC in a Worker

Run tRPC in a web worker / electron main thread


## Web Worker

### Worker thread

```ts
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { createWorkerServer } from "@hadeeb/trpc-worker/adapter";
import { appRouter } from "../path/to/router";
import { createContext } from "../path/to/context";

applyWSSHandler({
  router: appRouter,
  createContext,
  wss: createWorkerServer({ worker: self }),
});
```

### Main thread

```ts
import { createTRPCProxyClient, wsLink } from "@trpc/client";
import { createWorkerClient } from "@hadeeb/trpc-worker/link";
import type { AppRouter } from "../path/to/server/trpc";

const worker = new Worker("../path/to/trpc/worker");
const client = createTRPCProxyClient<AppRouter>({
  links: [
    wsLink({
      client: createWorkerClient({ worker }),
    }),
  ],
});
```

## Electron

### Main Process

```ts
import { ipcMain } from "electron";
import { createElectronServer } from "@hadeeb/trpc-worker/adapter";

applyWSSHandler({
  router: appRouter,
  createContext,
  wss: createElectronServer({ ipcMain }),
});
```

### Preload script

```ts
import { ipcRenderer } from "electron";
import { trpcElectronPreload } from "@hadeeb/trpc-worker/adapter";

trpcElectronPreload({ ipcRenderer });
```

### Browser script

```ts
const client = createTRPCProxyClient<AppRouter>({
  links: [
    wsLink({
      client: createWorkerClient({ worker: window }),
    }),
  ],
});
```

## :warning: Compatibility with tRPC Updates

This depends on the internals default tRPC Websocket link & `ws` adapter.

It helps keep the implementation very light.

However, it may break with tRPC patch updates.

Please check before updating tRPC.
