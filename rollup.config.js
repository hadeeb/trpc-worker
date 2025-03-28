// @ts-check
import * as fs from "node:fs";

import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import { defineConfig } from "rollup";

import packageJson from "./package.json" with { type: "json" };

const SOURCE = "src";
const OUTPUT = "dist";

export default defineConfig({
	input: { adapter: `./${SOURCE}/adapter.ts`, link: `./${SOURCE}/link.ts` },
	output: [
		{
			dir: `./${OUTPUT}`,
			format: "cjs",
			entryFileNames: "[name].cjs",
			chunkFileNames: "[name]-[hash].cjs",
		},
		{
			dir: `./${OUTPUT}`,
			format: "esm",
			entryFileNames: "[name].js",
			chunkFileNames: "[name]-[hash].js",
		},
	],
	external: Object.keys(packageJson.peerDependencies),
	plugins: [
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
