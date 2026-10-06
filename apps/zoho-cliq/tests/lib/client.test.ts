import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  apiHostFromConnection,
  base64ToBytes,
  compact,
  formatCliqError,
  postResult,
  seg,
  toList,
  unwrapData,
  ZohoCliqClient,
} from "../../lib/client.ts";
import { API_HOSTS, REGIONS } from "../../lib/regions.ts";
import { mockCliqCtx, mockCtx } from "../_helpers.ts";
import pkg from "../../package.json" with { type: "json" };

Deno.test("client: network.allow equals the region API hosts, exactly", () => {
  assertEquals([...pkg.w6w.network.allow].sort(), [...API_HOSTS].sort());
  assertEquals(API_HOSTS.length, 9);
  assert(API_HOSTS.includes("cliq.zohocloud.ca"));
  assert(!API_HOSTS.includes("cliq.zoho.ca"));
});

Deno.test("client: every region follows cliq.<...> / accounts.<...>", () => {
  for (const r of REGIONS) {
    assert(r.apiHost.startsWith("cliq."), r.apiHost);
    assert(r.accountsHost.startsWith("accounts."), r.accountsHost);
  }
});

Deno.test("client: host comes from the connection, defaulting to US", () => {
  assertEquals(apiHostFromConnection(undefined), "cliq.zoho.com");
  const { ctx } = mockCliqCtx([], "cliq.zoho.eu");
  assertEquals(apiHostFromConnection(ctx.connection), "cliq.zoho.eu");
});

Deno.test("client: builds https://<host>/api/v2<path>, drops empty query values, never sets Authorization", async () => {
  const { ctx, calls } = mockCliqCtx([{ body: { ok: 1 } }], "cliq.zoho.in");
  await new ZohoCliqClient(ctx).request("/channels", {
    query: { limit: 5, name: "", joined: false, x: undefined },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.in");
  assertEquals(url.pathname, "/api/v2/channels");
  assertEquals(url.search, "?limit=5&joined=false");
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: JSON bodies get a content-type", async () => {
  const { ctx, calls } = mockCliqCtx([{ body: {} }]);
  await new ZohoCliqClient(ctx).request("/x", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("client: a 204 with no body resolves to undefined", async () => {
  const { ctx } = mockCliqCtx([{ status: 204 }]);
  assertEquals(await new ZohoCliqClient(ctx).request("/x", { method: "POST" }), undefined);
});

Deno.test("client: a JSON error carries the vendor code and message", async () => {
  const { ctx } = mockCliqCtx([{
    status: 401,
    body: { code: "oauthtoken_invalid", message: "Invalid OAuth token passed." },
  }]);
  const err = await assertRejects(() => new ZohoCliqClient(ctx).request("/channels"), Error);
  assert(err.message.includes("401"));
  assert(err.message.includes("oauthtoken_invalid"));
  assert(err.message.includes("Invalid OAuth token passed."));
});

Deno.test("client: the blank text/html 401 (no token) is reported by status alone", async () => {
  const { ctx } = mockCliqCtx([{ status: 401, body: "\n\n" }]);
  const err = await assertRejects(() => new ZohoCliqClient(ctx).request("/channels"), Error);
  assertEquals(err.message, "Zoho Cliq 401 for GET /api/v2/channels");
});

Deno.test("client: a 200 that is not JSON is an error, not a silent undefined", async () => {
  const { ctx } = mockCliqCtx([{ body: "<html>shell</html>" }]);
  await assertRejects(() => new ZohoCliqClient(ctx).request("/channels"), Error, "expected JSON");
});

Deno.test("formatCliqError: truncates a long non-JSON body", () => {
  const msg = formatCliqError(502, "GET", "/api/v2/x", "x".repeat(2000));
  assert(msg.includes("truncated"));
});

Deno.test("helpers: seg encodes, compact keeps false/0, toList splits, unwrapData accepts both", () => {
  assertEquals(seg("a b/c@d.com"), "a%20b%2Fc%40d.com");
  assertEquals(seg("1645632094118 223997917594"), "1645632094118%20223997917594");
  assertEquals(compact({ a: 0, b: false, c: "", d: undefined, e: null, f: "x" }), {
    a: 0,
    b: false,
    f: "x",
  });
  assertEquals(toList("a, b\nc,,"), ["a", "b", "c"]);
  assertEquals(toList([" a ", 2]), ["a", "2"]);
  assertEquals(toList(undefined), []);
  assertEquals(unwrapData({ data: { id: 1 } }), { id: 1 });
  assertEquals(unwrapData({ id: 1 }), { id: 1 });
  assertEquals(unwrapData(undefined), {});
});

Deno.test("helpers: postResult reads message_id, tolerates an empty response", () => {
  assertEquals(postResult({ message_id: "m1" }), {
    success: true,
    messageId: "m1",
    response: { message_id: "m1" },
  });
  assertEquals(postResult(undefined), { success: true, messageId: undefined, response: null });
});

Deno.test("helpers: base64ToBytes decodes, with or without a data: prefix", () => {
  const bytes = new Uint8Array(base64ToBytes(btoa("hi")));
  assertEquals([...bytes], [104, 105]);
  assertEquals([...new Uint8Array(base64ToBytes(`data:text/plain;base64,${btoa("hi")}`))], [
    104,
    105,
  ]);
});

Deno.test("mockCtx sanity: unexpected fetch fails loudly", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => new ZohoCliqClient(ctx).request("/x"), Error, "unexpected fetch");
});
