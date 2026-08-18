import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  AlgoliaClient,
  compact,
  csv,
  json,
  jsonObject,
  READ_HOST,
  resolveAppId,
  WRITE_HOST,
} from "../../lib/client.ts";

const display = { appId: "APPID" };

Deno.test("hosts: reads go to the DSN host, writes to the primary", () => {
  // The builders preserve the app id's case...
  assertEquals(READ_HOST("APPID"), "https://APPID-dsn.algolia.net");
  assertEquals(WRITE_HOST("APPID"), "https://APPID.algolia.net");
});

/**
 * ...and `URL` then lowercases the host, per the WHATWG spec's host
 * normalisation. Harmless — DNS is case-insensitive — but asserted so nobody
 * later "fixes" a lowercase host thinking it is a bug.
 */
Deno.test("hosts: URL normalisation lowercases the host on the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new AlgoliaClient(ctx).request("/1/indexes", { read: true });
  assertEquals(new URL(calls[0].url).host, "appid-dsn.algolia.net");
});

Deno.test("resolveAppId: a connection with no app id is a directive error", () => {
  assertEquals(resolveAppId({ display: { appId: "APPID" } } as never), "APPID");
  const err = assertThrows(() => resolveAppId({ display: {} } as never), Error);
  assert(err.message.includes("reconnect"), err.message);
});

Deno.test("compact: drops unset keys and empty arrays, keeps false and zero", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0, g: [] }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("csv: takes a comma string or a live array", () => {
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(["a"]), ["a"]);
  assertEquals(csv(""), undefined);
});

Deno.test("json / jsonObject: parse, and reject the wrong shape by name", () => {
  assertEquals(json('{"a":1}', "record"), { a: 1 });
  assertEquals(jsonObject('{"a":1}', "record"), { a: 1 });
  assertEquals(jsonObject("", "record"), undefined);
  // An array where an object is required is a real mistake worth naming.
  const arr = assertThrows(() => jsonObject("[1,2]", "record"), Error);
  assert(arr.message.includes("must be a JSON object"), arr.message);
  const bad = assertThrows(() => json("{oops", "settings"), Error);
  assert(bad.message.includes("settings"), bad.message);
});

Deno.test("client: a read goes to the DSN host and a write to the primary", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }, { status: 200, body: {} }], {
    display,
  });
  const client = new AlgoliaClient(ctx);
  await client.request("/1/indexes/products/query", { method: "POST", body: {}, read: true });
  await client.request("/1/indexes/products", { method: "POST", body: {} });
  assertEquals(calls[0].url, "https://appid-dsn.algolia.net/1/indexes/products/query");
  assertEquals(calls[1].url, "https://appid.algolia.net/1/indexes/products");
});

Deno.test("client: never sets the credential headers — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new AlgoliaClient(ctx).request("/1/indexes", { read: true });
  assertEquals(calls[0].headers["x-algolia-api-key"], undefined);
  assertEquals(calls[0].headers["x-algolia-application-id"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("client: a failure surfaces the status and Algolia's own message", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { message: "Not enough rights to update an object near line:1 column:12", status: 403 },
  }], { display });
  const err = await assertRejects(
    async () => await new AlgoliaClient(ctx).request("/1/indexes/products"),
    Error,
  );
  assert(err.message.includes("403"), err.message);
  assert(err.message.includes("Not enough rights"), err.message);
});

Deno.test("client: 204 comes back as undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }], { display });
  assertEquals(
    await new AlgoliaClient(ctx).request("/1/indexes/x", { method: "DELETE" }),
    undefined,
  );
});
