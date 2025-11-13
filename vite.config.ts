import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

import packageJson from "./package.json" with { type: "json" };

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	build: {
		lib: {
			entry: {
				adapter: resolve(__dirname, "src/adapter.ts"),
				link: resolve(__dirname, "src/link.ts"),
			},
			formats: ["cjs", "es"],
		},
		minify: false,
		rollupOptions: { external: Object.keys(packageJson.peerDependencies) },
	},
	plugins: [
		{
			name: "dts",
			generateBundle(opts) {
				if (opts.format !== "es") return;
				const inputs = ["adapter", "link"];
				for (const input of inputs) {
					this.emitFile({
						type: "asset",
						fileName: `${input}.d.ts`,
						source: `export * from '../src/${input}.ts';`,
					});
				}
			},
		},
	],
});
