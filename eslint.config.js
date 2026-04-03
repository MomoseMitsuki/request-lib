import { defineConfig } from "eslint/config";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier";
import eslintConfigPrettier from "eslint-plugin-prettier/recommended";

const ignores = ["**/*.d.ts", "**/node_modules/**", "**/dist/**", "**/html/**"];

export default defineConfig({
	ignores,
	extends: [eslint.configs.recommended, ...tseslint.configs.recommended, eslintConfigPrettier],
	plugins: {
		prettier: eslintPluginPrettier
	},
	languageOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
		parser: tseslint.parser
	},
	rules: {
		"@typescript-eslint/no-explicit-any": "off",
		"@typescript-eslint/no-unsafe-function-type": "off",
		"no-var": "error",
		"no-empty": "off"
	}
});
