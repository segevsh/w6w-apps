import { assert, assertEquals } from "@std/assert";
import secretToken from "../auth/secret-token.ts";
import { errorBody, mockCtx, pathOf } from "./_helpers.ts";

const BASIC = `Basic ${btoa("tok_123:")}`;

Deno.test("auth: sign stamps Basic with the token as username and an empty password", async () => {
  const req = { url: "https://esignatures.com/api/templates", method: "GET", headers: {} } as never;
  const out = await secretToken.sign!(
    { request: req, credential: { secretToken: "tok_123" } } as never,
    mockCtx().ctx,
  ) as { headers: Record<string, string> };
  assertEquals(out.headers["authorization"], BASIC);
  assert(atob(BASIC.slice(6)).endsWith(":"));
});

Deno.test("auth: test passes on a list-shaped response and sends the Basic header", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ template_id: "t1", title: "NDA" }] } }]);
  const out = await secretToken.test({ credential: { secretToken: "tok_123" } } as never, ctx);
  assertEquals(out.ok, true);
  assertEquals(pathOf(calls[0].url), "/api/templates");
  assertEquals(calls[0].headers["authorization"], BASIC);
  assertEquals(calls[0].url.includes("token="), false);
});

Deno.test("auth: a 200 that is not the documented shape is not a pass", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>SPA shell</html>" }]);
  const out = await secretToken.test({ credential: { secretToken: "tok_123" } } as never, ctx);
  assertEquals(out.ok, false);
});

Deno.test("auth: test classifies the vendor's forbidden code (HTTP 403, not 401)", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: errorBody("forbidden", "Invalid or missing Secret token") },
  ]);
  const out = await secretToken.test({ credential: { secretToken: "bad" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("forbidden"), out.message);
});

Deno.test("auth: test fails without calling the network when the token is blank", async () => {
  const { ctx, calls } = mockCtx();
  const out = await secretToken.test({ credential: { secretToken: "  " } } as never, ctx);
  assertEquals(out.ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("auth: an unexpected error code is reported, not mistaken for a bad token", async () => {
  const { ctx } = mockCtx([{ status: 429, body: errorBody("rate-limited", "slow down") }]);
  const out = await secretToken.test({ credential: { secretToken: "tok" } } as never, ctx);
  assertEquals(out.ok, false);
  assert(out.message?.includes("rate-limited"), out.message);
});
