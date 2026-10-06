import { assertEquals, assertRejects } from "@std/assert";
import { encodeId, formatError, isoDate, PerspectiveClient } from "../../lib/client.ts";
import { errorBody, mockCtx } from "../_helpers.ts";

Deno.test("client: surfaces the vendor's error text and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("Contact not found", 404) }]);
  const err = await assertRejects(() => new PerspectiveClient(ctx).data("/x"), Error);
  assertEquals(err.message, "Perspective 404: Contact not found");
});

Deno.test("client: a 429 reports retryAfter", () => {
  assertEquals(
    formatError(429, { error: "Rate limit exceeded", status: 429, retryAfter: 60 }),
    "Perspective 429: Rate limit exceeded (retry after 60s)",
  );
});

Deno.test("client: a non-JSON failure falls back to the HTTP status", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "<html>bad gateway</html>" }]);
  const err = await assertRejects(() => new PerspectiveClient(ctx).data("/x"), Error);
  assertEquals(err.message, "Perspective returned HTTP 502");
});

Deno.test("client: encodeId stops a slash escaping the path segment", () => {
  assertEquals(encodeId("a/../b"), "a%2F..%2Fb");
});

Deno.test("client: isoDate normalises and rejects garbage", () => {
  assertEquals(isoDate("2025-01-01", "from"), "2025-01-01T00:00:00.000Z");
  try {
    isoDate("not a date", "from");
    throw new Error("should have thrown");
  } catch (e) {
    assertEquals((e as Error).message, "from is not a valid ISO 8601 date-time");
  }
});

Deno.test("client: never sends credentials itself", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new PerspectiveClient(ctx).data("/workspaces");
  assertEquals(calls[0].headers["x-perspective-api-key"], undefined);
  assertEquals(calls[0].headers["authorization"], undefined);
});
