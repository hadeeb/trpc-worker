# tRPC in a Worker

Run tRPC in a web worker

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
  wss: createWorkerServer(),
});
```

### Main thread

```ts
import { createTRPCProxyClient } from "@trpc/client";
import { workerLink } from "@hadeeb/trpc-worker/link";
import type { AppRouter } from "../path/to/server/trpc";

const client = createTRPCProxyClient<AppRouter>({
  links: [
    workerLink({
      worker: new Worker("../path/to/trpc/worker"),
    }),
  ],
});
```

## Electron

### Main Process

```ts
import { createEletronServer } from "@hadeeb/trpc-worker/adapter";

applyWSSHandler({
  router: appRouter,
  createContext,
  wss: createEletronServer(),
});
```

### Preload script

```ts
import { trpcElectronPreload } from "@hadeeb/trpc-worker/adapter";
trpcElectronPreload();
```

### Browser script

```ts
const client = createTRPCProxyClient<AppRouter>({
  links: [workerLink({ worker: window })],
});
```
