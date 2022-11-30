# tRPC Worker

Run tRPC in a web worker

## Worker thread

```ts
import { applyWorkerHandler } from "@hadeeb/trpc-worker/adapter";
import { appRouter } from "./router";
import { createContext } from "./context";

applyWorkerHandler({ router: appRouter, createContext });
```

## Main thread

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
