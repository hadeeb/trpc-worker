// @ts-check
import * as fs from "node:fs";

import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";
import externals from "rollup-plugin-node-externals";

const SOURCE = "src";
const OUTPUT = "dist";

export default defineConfig({
	input: { adapter: `./${SOURCE}/adapter.ts`, link: `./${SOURCE}/link.ts` },
	output: [
		{
			dir: `./${OUTPUT}`,
			format: "cjs",
			entryFileNames: "[name].js",
			chunkFileNames: "[name]-[hash].js",
		},
		{
			dir: `./${OUTPUT}`,
			format: "esm",
			entryFileNames: "[name].mjs",
			chunkFileNames: "[name]-[hash].mjs",
		},
	],
	plugins: [
		externals(),
		nodeResolve({ extensions: [".ts"] }),
		typescript({ tsconfig: "tsconfig.json", tslib: "null" }),
		{
			name: "clean-output",
			buildStart(_) {
				fs.rmSync(`./${OUTPUT}`, { recursive: true, force: true });
			},
		},
	],
});
