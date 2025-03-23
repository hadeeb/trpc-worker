import * as timers from "node:timers/promises";

import { createTRPCClient, wsLink } from "@trpc/client";
import { initTRPC } from "@trpc/server";
import { applyWSSHandler } from "@trpc/server/adapters/ws";

import { createWorkerServer } from "./adapter.ts";
import { createWorkerClient } from "./link.ts";

const t = initTRPC.create();

declare global {
	interface NumberConstructor {
		isInteger(value: unknown): value is number;
	}
}

const router = t.router({
	test: t.procedure.query(() => {
		console.log("Hello");
		return "Hello";
	}),
	sub: t.procedure
		.input((value) => {
			if (!Number.isInteger(value)) {
				throw new Error(
					`Expected integer, actual ${JSON.stringify({
						type: typeof value,
						value,
					})}`,
				);
			}
			return value;
		})
		// v10
		// .subscription(({ input }) =>
		// 	observable<number>(({ next }) => {
		// 		const interval = setInterval(() => {
		// 			next(input);
		// 		}, 1e3);
		// 		return () => {
		// 			clearInterval(interval);
		// 		};
		// 	}),
		// )
		.subscription(async function* ({ input }) {
			for await (const _ of timers.setInterval(1e3)) {
				console.log("Server", input);
				yield `Hello ${input++}`;
			}
		}),
});

const { port1, port2 } = new MessageChannel();

const handler = applyWSSHandler({
	router: router,
	wss: createWorkerServer({ worker: port1 }),
	onError(err) {
		console.error("Error in handler", err);
	},
});

// v10
// const client = createTRPCProxyClient<typeof router>({
// 	links: [wsLink({ client: createWorkerClient({ worker: port2 }) })],
// });

const client = createTRPCClient<typeof router>({
	links: [wsLink({ client: createWorkerClient({ worker: port2 }) })],
});

port1.start();
port2.start();

function logMemoryUsage() {
	const usage = process.memoryUsage();
	let sum = 0;
	for (const [key, value] of Object.entries(usage)) {
		console.log(`Memory usage by ${key}, ${value / 1000000}MB `);
		sum += value;
	}

	console.log(`Total Memory usage, ${sum / 1000000}MB `);
}

async function main() {
	console.log("Main");

	const res = await client.test.query();
	console.log({ res });
	console.log("Main");

	const sub1 = client.sub.subscribe(0, {
		onData(v1) {
			console.log({ v1 });
		},
	});

	setTimeout(() => {
		console.log("Stopping sub v1");
		sub1.unsubscribe();
	}, 2e3 + 1);
	const sub2 = client.sub.subscribe(10, {
		onData(v2) {
			console.log({ v2 });
		},
	});

	setTimeout(() => {
		console.log("Stopping sub v2");
		sub2.unsubscribe();
	}, 2e3 + 1);

	setTimeout(() => {
		const sub3 = client.sub.subscribe(0, {
			onData(v3) {
				console.log({ v3 });
			},
		});
	}, 3e3 + 1);
	logMemoryUsage();
}
process.on("SIGINT", () => {
	logMemoryUsage();
	process.exit(0);
});

await main();
