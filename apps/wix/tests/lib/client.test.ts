import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  API_URL,
  compact,
  cursorPaging,
  offsetPageQuery,
  offsetPaging,
  SCOPE_HEADER,
  WixClient,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: resolves relative paths against the Wix API base", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new WixClient(ctx).request("/wix-data/v2/collections");
  assertEquals(calls[0].url, `${API_URL}/wix-data/v2/collections`);
  assertEquals(API_URL, "https://www.wixapis.com");
});

Deno.test("client: never sets an Authorization header — that is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new WixClient(ctx).request("/x", { method: "POST", body: { a: 1 } });
  const names = Object.keys(calls[0].headers).map((h) => h.toLowerCase());
  assert(!names.includes("authorization"));
  assert(!names.includes("wix-site-id"));
  assert(!names.includes("wix-account-id"));
});

Deno.test("client: stamps the scope marker, defaulting to site", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new WixClient(ctx);
  await client.request("/x");
  assertEquals(calls[0].headers[SCOPE_HEADER], "site");
  await client.request("/y", { scope: "account" });
  assertEquals(calls[1].headers[SCOPE_HEADER], "account");
});

Deno.test("client: drops undefined, null and empty query values", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new WixClient(ctx).request("/x", {
    query: { keep: "yes", zero: 0, no: undefined, nul: null, empty: "", off: false },
  });
  const p = new URL(calls[0].url).searchParams;
  assertEquals([...p.keys()].sort(), ["keep", "off", "zero"]);
  assertEquals(p.get("zero"), "0", "0 is a value, not an absence");
  assertEquals(p.get("off"), "false", "false is a value, not an absence");
});

Deno.test("client: sets content-type only when there is a body", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }, { body: {} }]);
  const client = new WixClient(ctx);
  await client.request("/x");
  assert(!("content-type" in calls[0].headers));
  await client.request("/y", { method: "POST", body: {} });
  assertEquals(calls[1].headers["content-type"], "application/json");
});

Deno.test("client: throws a message naming status, method and path", async () => {
  const { ctx } = mockCtx([{ status: 429, statusText: "Too Many Requests", body: "slow down" }]);
  const err = await assertRejects(
    () => new WixClient(ctx).request("/wix-data/v2/items", { method: "POST", body: {} }),
    Error,
  );
  assert(err.message.includes("Wix 429"));
  assert(err.message.includes("POST /wix-data/v2/items"));
  assert(err.message.includes("slow down"));
});

Deno.test("client: returns undefined for 204 and for an empty 200", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }]);
  const client = new WixClient(ctx);
  assertEquals(await client.request("/x"), undefined);
  assertEquals(await client.request("/y"), undefined);
});

Deno.test("offsetPageQuery: emits Wix's dotted names", () => {
  assertEquals(offsetPageQuery({ limit: 5, offset: 10 }), {
    "paging.limit": 5,
    "paging.offset": 10,
  });
  assertEquals(offsetPageQuery({}), { "paging.limit": undefined, "paging.offset": undefined });
});

Deno.test("offsetPaging: returns undefined when nothing was asked for", () => {
  assertEquals(offsetPaging({}), undefined);
  assertEquals(offsetPaging({ limit: 5 }), { limit: 5, offset: undefined });
  assertEquals(offsetPaging({ offset: 0 }), { limit: undefined, offset: 0 });
});

Deno.test("cursorPaging: returns undefined when nothing was asked for", () => {
  assertEquals(cursorPaging({}), undefined);
  assertEquals(cursorPaging({ cursor: "c" }), { limit: undefined, cursor: "c" });
});

Deno.test("compact: drops undefined but keeps null, 0, false and empty string", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: 0, e: false, f: "" }),
    { a: 1, c: null, d: 0, e: false, f: "" },
  );
});
