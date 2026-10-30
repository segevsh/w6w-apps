import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { compact, parseJson, XaiClient } from "../../lib/client.ts";

test("client: sends no authorization header and JSON-encodes bodies", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new XaiClient(ctx).request("/v1/x", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
});

test("client: drops empty query values, returns text for non-JSON and undefined for 204", async () => {
  const { ctx, calls } = mockCtx([
    { body: "raw", headers: { "content-type": "text/plain" } },
    { status: 204 },
  ]);
  const c = new XaiClient(ctx);
  assertEquals(await c.request("/v1/x", { query: { a: "1", b: "", c: undefined } }), "raw");
  assertEquals(new URL(calls[0].url).search, "?a=1");
  assertEquals(await c.request("/v1/x"), undefined);
});

test("client: error text without a JSON body still reports the status", async () => {
  const { ctx } = mockCtx([{
    status: 502,
    body: "bad gateway",
    headers: { "content-type": "text/plain" },
  }]);
  try {
    await new XaiClient(ctx).request("/v1/x");
  } catch (e) {
    assert((e as Error).message.includes("502"));
    return;
  }
  throw new Error("expected throw");
});

test("client: compact and parseJson", () => {
  assertEquals(compact({ a: 1, b: null, c: undefined, d: "", e: false }), { a: 1, e: false });
  assertEquals(parseJson("x", { k: 1 }), { k: 1 });
  assertEquals(parseJson("x", "[1]"), [1]);
});
