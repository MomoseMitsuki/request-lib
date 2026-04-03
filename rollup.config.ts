import { defineConfig } from "rollup";
import terser from "@rollup/plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";

export default defineConfig({
	input: {
		index: "./src/index.ts",
		"fetch-imp": "./src/request-imp/request-fetch-imp.ts",
		"xhr-imp": "./src/request-imp/request-xhr-imp.ts"
	},
	output: {
		format: "es",
		dir: "dist",
		entryFileNames: "[name].js",
		chunkFileNames: "[name].js"
	},
	external: ["axios"],
	plugins: [terser(), resolve(), typescript(), commonjs()]
});
