import * as timers from "node:timers/promises";

import { createTRPCClient, wsLink } from "@trpc/client";
import { type AnyRouter, initTRPC } from "@trpc/server";
import { applyWSSHandler } from "@trpc/server/adapters/ws";
import { describe, expect, expectTypeOf, test, vi } from "vitest";

import { createWorkerServer } from "./adapter.ts";
import { createWorkerClient } from "./link.ts";

const t = initTRPC.create();

declare global {
	interface NumberConstructor {
		isInteger(value: unknown): value is number;
	}
}

const validators = {
	string(value: unknown) {
		if (typeof value !== "string") {
			throw new Error(
				`Expected string, actual ${JSON.stringify({ type: typeof value, value })}`,
			);
		}
		return value;
	},
	integer(value: unknown) {
		if (!Number.isInteger(value)) {
			throw new Error(
				`Expected integer, actual ${JSON.stringify({ type: typeof value, value })}`,
			);
		}
		return value;
	},
};

function getClient<T extends AnyRouter>(router: T) {
	const { port1, port2 } = new MessageChannel();

	applyWSSHandler<any>({
		router: router,
		wss: createWorkerServer({ worker: port1 }),
		onError(err) {
			console.error("Error in handler", err);
		},
	});

	const client = createTRPCClient<typeof router>({
		links: [wsLink<any>({ client: createWorkerClient({ worker: port2 }) })],
	});

	return client;
}

describe("Adapter", () => {
	test("Simple query", async () => {
		const client = getClient(
			t.router({ test: t.procedure.query(() => "Hello") }),
		);
		const res = await client.test.query();
		expectTypeOf(res).toEqualTypeOf<string>();
		expect(res).toBe("Hello");
	});

	test("Query with input", async () => {
		const client = getClient(
			t.router({
				test: t.procedure
					.input(validators.string)
					.query((opts) => `Hello ${opts.input}`),
			}),
		);
		const res = await client.test.query("World");
		expectTypeOf(res).toEqualTypeOf<string>();
		expect(res).toBe("Hello World");
	});

	test("Mutation", async () => {
		const client = getClient(
			t.router({
				test: t.procedure
					.input(validators.integer)
					.mutation((opts) => `Hello ${opts.input}`),
			}),
		);
		const res = await client.test.mutate(42);
		expectTypeOf(res).toEqualTypeOf<string>();
		expect(res).toBe("Hello 42");
	});

	test("Subscription", async () => {
		const client = getClient(
			t.router({
				test: t.procedure
					.input(validators.integer)
					.subscription(async function* (opts) {
						for (const i of [1, 2, 3]) {
							yield `Hello ${opts.input + i}`;
						}
					}),
			}),
		);

		const callback = vi.fn();

		const res = client.test.subscribe(5, { onData: callback });
		await timers.setTimeout(5);
		expect(callback).toHaveBeenCalledTimes(3);
		expect(callback).toHaveBeenNthCalledWith(1, "Hello 6");
		expect(callback).toHaveBeenNthCalledWith(2, "Hello 7");
		expect(callback).toHaveBeenNthCalledWith(3, "Hello 8");
		res.unsubscribe();
	});
});
