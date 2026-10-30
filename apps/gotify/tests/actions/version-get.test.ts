import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/version-get.ts";

const conn = { display: { baseUrl: "https://gotify.example.com" } };

test("version-get: GETs /version", async () => {
  const body = { version: "2.6.3", commit: "abc123", buildDate: "2026-01-01T00:00:00Z" };
  const { ctx, calls } = mockCtx([{ status: 200, body }], conn);
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/version");
  assertEquals(result, body);
});
