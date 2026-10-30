import { test } from "node:test";
import { assertEquals, assertThrows } from "../_assert.ts";
import {
  appHost,
  baseUrl,
  compact,
  ingestionHost,
  projectIdFromConnection,
  projectPath,
  regionFromConnection,
} from "../../lib/client.ts";
import type { RedactedConnection } from "@w6w/types";

/** A `RedactedConnection` carrying only the `display` fields a test needs. */
function conn(display: Record<string, unknown>): RedactedConnection {
  return { display } as unknown as RedactedConnection;
}

test("appHost: us and eu map to the two app/query API hosts", () => {
  assertEquals(appHost("us"), "us.posthog.com");
  assertEquals(appHost("eu"), "eu.posthog.com");
});

test("ingestionHost: us and eu map to the two ingestion hosts, distinct from appHost", () => {
  assertEquals(ingestionHost("us"), "us.i.posthog.com");
  assertEquals(ingestionHost("eu"), "eu.i.posthog.com");
});

test("regionFromConnection: reads display.region, defaults to us", () => {
  assertEquals(regionFromConnection(undefined), "us");
  assertEquals(regionFromConnection(conn({})), "us");
  assertEquals(regionFromConnection(conn({ region: "eu" })), "eu");
  // Anything other than the literal "eu" is treated as US — never silently
  // routes a request to the wrong regional host.
  assertEquals(regionFromConnection(conn({ region: "bogus" })), "us");
});

test("projectIdFromConnection: reads display.projectId, defaults to empty string", () => {
  assertEquals(projectIdFromConnection(undefined), "");
  assertEquals(projectIdFromConnection(conn({ projectId: "123" })), "123");
});

test("baseUrl: composes the app host from the connection's region", () => {
  assertEquals(baseUrl(undefined), "https://us.posthog.com");
  assertEquals(baseUrl(conn({ region: "eu" })), "https://eu.posthog.com");
});

test("projectPath: builds /api/projects/{id}{suffix}", () => {
  assertEquals(
    projectPath(conn({ projectId: "42" }), "/persons/"),
    "/api/projects/42/persons/",
  );
});

test("projectPath: throws when the connection has no projectId", () => {
  assertThrows(() => projectPath(conn({}), "/persons/"), Error, "projectId");
});

test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: "x", b: undefined, c: null, d: "", e: 0, f: false }), {
    a: "x",
    e: 0,
    f: false,
  });
});
