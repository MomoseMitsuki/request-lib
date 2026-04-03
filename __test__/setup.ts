import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";
import handlers from "./server/http-handlers";

const server = setupServer(...handlers);

beforeAll(() =>
	server.listen({
		onUnhandledRequest: "bypass"
	})
);

afterAll(() => server.close());

afterEach(() => server.resetHandlers());
