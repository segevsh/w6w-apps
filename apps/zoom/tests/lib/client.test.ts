import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { API_URL, compact, OAUTH_TOKEN_URL, unset, ZoomClient } from "../../lib/client.ts";

Deno.test("client: targets the v2 API and sets no Authorization header", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await new ZoomClient(ctx).request("/users/me");
  assertEquals(calls[0].url, "https://api.zoom.us/v2/users/me");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("client: the OAuth host is separate from the API host", () => {
  // Both have to be on the egress allowlist: the implicit OAuth allowance only
  // covers endpoints declared in an `oauth2` block, and server-to-server mints
  // its token by hand.
  assertEquals(new URL(API_URL).hostname, "api.zoom.us");
  assertEquals(new URL(OAUTH_TOKEN_URL).hostname, "zoom.us");
});

Deno.test("client: returns undefined for Zoom's 204 responses", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(
    await new ZoomClient(ctx).request("/meetings/1", { method: "PATCH", body: { topic: "x" } }),
    undefined,
  );
});

Deno.test("client: surfaces Zoom's error body", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    statusText: "Not Found",
    body: '{"code":3001,"message":"Meeting does not exist"}',
  }]);
  await assertRejects(
    () => new ZoomClient(ctx).request("/meetings/1"),
    Error,
    "Meeting does not exist",
  );
});

Deno.test("compact/unset behave as the other apps' helpers do", () => {
  assertEquals(compact({ a: 0, b: false, c: undefined, d: null }), { a: 0, b: false });
  assertEquals(unset(""), undefined);
});
