// @ts-check
import * as fs from "fs";
import * as path from "path";
import { defineConfig } from "rollup";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
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
      name: "multi-output",
      buildStart(inputOptions) {
        fs.rmSync(`./${OUTPUT}`, { recursive: true, force: true });

        const entries = Object.keys(inputOptions.input);
        const exportMap = {};
        entries.forEach((name) => {
          exportMap[`./${name}`] = {
            types: `./${OUTPUT}/${name}.d.ts`,
            import: `./${OUTPUT}/${name}.mjs`,
            require: `./${OUTPUT}/${name}.js`,
          };

          fs.rmSync(`./${name}`, { recursive: true, force: true });
          writeFile(
            `./${name}/index.js`,
            `module.exports = require('../${OUTPUT}/${name}.js');`
          );
          writeFile(
            `./${name}/index.d.ts`,
            `export * from '../${OUTPUT}/${name}';`
          );
        });

        const { devDependencies, ...packageJSON } = JSON.parse(
          fs.readFileSync("package.json").toString()
        );

        fs.writeFileSync(
          "package.json",
          JSON.stringify(
            {
              ...packageJSON,
              files: [SOURCE, OUTPUT, ...entries],
              exports: exportMap,
            },
            null,
            2
          ) + "\n"
        );
      },
    },
  ],
});

/**
 * @param {string} filePath
 * @param {string} content
 */
function writeFile(filePath, content) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content, "utf8");
}
