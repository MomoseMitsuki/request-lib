import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		setupFiles: "./__test__/setup.ts",
		environment: "jsdom",
		reporters: ["tree", "html"],
		browser: {
			instances: [{ browser: "chromium" }]
		}
	}
});
