import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  compact,
  parseJsonParam,
  regionFromConnection,
  request,
  trackBase,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("trackBase: US and EU hosts", () => {
  assertEquals(trackBase("us"), "https://track.customer.io/api/v1");
  assertEquals(trackBase("eu"), "https://track-eu.customer.io/api/v1");
});

Deno.test("regionFromConnection: defaults to us when absent", () => {
  assertEquals(regionFromConnection(undefined), "us");
  assertEquals(regionFromConnection({ display: {} } as never), "us");
});

Deno.test("regionFromConnection: reads eu from display, ignores anything else", () => {
  assertEquals(regionFromConnection({ display: { region: "eu" } } as never), "eu");
  assertEquals(regionFromConnection({ display: { region: "weird" } } as never), "us");
});

Deno.test("parseJsonParam: passes an already-parsed object through", () => {
  assertEquals(parseJsonParam({ a: 1 }), { a: 1 });
});

Deno.test("parseJsonParam: parses a JSON string", () => {
  assertEquals(parseJsonParam('{"a":1}'), { a: 1 });
});

Deno.test("parseJsonParam: undefined/null/empty-string are absent", () => {
  assertEquals(parseJsonParam(undefined), undefined);
  assertEquals(parseJsonParam(null), undefined);
  assertEquals(parseJsonParam(""), undefined);
});

Deno.test("parseJsonParam: rejects a non-object JSON value", () => {
  assertThrows(() => parseJsonParam("42"), Error, "expected a JSON object");
});

Deno.test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: "x", b: undefined, c: null, d: "", e: 0, f: false }), {
    a: "x",
    e: 0,
    f: false,
  });
});

Deno.test("request: PUT with a body sends JSON content-type and returns success", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const result = await request(ctx, "us", "PUT", "/customers/u1", { email: "a@b.com" });
  assertEquals(calls[0].url, "https://track.customer.io/api/v1/customers/u1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { email: "a@b.com" });
  assertEquals(result, { success: true });
});

Deno.test("request: DELETE with no body sends no body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await request(ctx, "eu", "DELETE", "/customers/u1");
  assertEquals(calls[0].url, "https://track-eu.customer.io/api/v1/customers/u1");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].body, null);
});

Deno.test("request: a non-2xx response reads meta.error", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { meta: { error: "bad request" } } }]);
  await assertRejects(
    async () => await request(ctx, "us", "POST", "/events", { name: "e" }),
    Error,
    "Customer.io 400",
  );
});

Deno.test("request: a non-2xx response reads meta.errors as a joined list", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { meta: { errors: ["a", "b"] } } }]);
  const err = await assertRejects(
    async () => await request(ctx, "us", "POST", "/events", { name: "e" }),
    Error,
  );
  assert((err as Error).message.includes("a; b"));
});
