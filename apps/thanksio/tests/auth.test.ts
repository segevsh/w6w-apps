import { assert, assertEquals } from "@std/assert";
import apiToken, { authHeaders, PROBE_PATH } from "../auth/api-token.ts";
import { listEnvelope, mockCtx, pathOf } from "./_helpers.ts";

const credential = { apiToken: "tok_123" };

Deno.test("auth: sign stamps a bearer header", async () => {
  const req = {
    url: "https://api.thanks.io/api/v2/x",
    method: "GET",
    headers: {} as Record<string, string>,
  };
  const out = await apiToken.sign!({ request: req, credential } as never, {} as never);
  assertEquals((out as typeof req).headers["authorization"], "Bearer tok_123");
  assertEquals(authHeaders({}).authorization, "Bearer ");
});

Deno.test("auth: test passes only on the documented `data` array", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  const res = await apiToken.test({ credential } as never, ctx);
  assertEquals(res.ok, true);
  assertEquals(pathOf(calls[0].url), "/api/v2/mailing-lists/");
  assertEquals(new URL(calls[0].url).search, "?items_per_page=1");
  assertEquals(calls[0].headers["authorization"], "Bearer tok_123");
  assert(PROBE_PATH.startsWith("/mailing-lists/"));
});

Deno.test("auth: a 200 that is not the documented shape is not a pass", async () => {
  const { ctx } = mockCtx([{
    body: "<html>shell</html>",
    headers: { "content-type": "text/html" },
  }]);
  const res = await apiToken.test({ credential } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("unexpected response"), res.message);
});

Deno.test("auth: an `Unauthenticated.` body is a rejected token", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Unauthenticated." } }]);
  const res = await apiToken.test({ credential } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("rejected the API token"), res.message);
  assert(!res.message?.includes("tok_123"));
});

Deno.test("auth: 402 is reported as a billing problem, not a bad token", async () => {
  const { ctx } = mockCtx([{ status: 402, body: { message: "disabled" } }]);
  const res = await apiToken.test({ credential } as never, ctx);
  assertEquals(res.ok, false);
  assert(res.message?.includes("payment failures"), res.message);
});

Deno.test("auth: a missing token never reaches the network", async () => {
  const { ctx, calls } = mockCtx([]);
  const res = await apiToken.test({ credential: {} } as never, ctx);
  assertEquals(res.ok, false);
  assertEquals(calls.length, 0);
});
