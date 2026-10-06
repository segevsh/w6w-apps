import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  codeOf,
  compact,
  dataOf,
  emailOptions,
  messageOf,
  parseJson,
  requireObject,
  WizaClient,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: GET with a query string and no body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await new WizaClient(ctx).call("/api/meta/location_autocomplete", { query: { query: "Tor on" } });
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://wiza.co/api/meta/location_autocomplete?query=Tor+on");
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: POST sends JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new WizaClient(ctx).call("/api/lists", { method: "POST", body: { a: 1 } });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, '{"a":1}');
});

Deno.test("client: both error envelopes surface the vendor's message", async () => {
  const nested = mockCtx([{
    status: 401,
    body: { status: { code: 401, message: "Invalid API key." } },
  }]);
  const e1 = await assertRejects(() => new WizaClient(nested.ctx).call("/api/meta/credits"));
  assert(String(e1).includes("401") && String(e1).includes("Invalid API key."));
  const flat = mockCtx([{ status: 404, body: { status: 404, message: "List not found" } }]);
  const e2 = await assertRejects(() => new WizaClient(flat.ctx).call("/api/lists/9"));
  assert(String(e2).includes("List not found"));
});

Deno.test("client: a non-JSON body fails with a truncated excerpt", async () => {
  const { ctx } = mockCtx([{ body: "<html>challenge</html>" }]);
  const e = await assertRejects(() => new WizaClient(ctx).call("/api/meta/credits"));
  assert(String(e).includes("challenge"));
});

Deno.test("helpers: messageOf, codeOf, dataOf, compact, parseJson, requireObject, emailOptions", () => {
  assertEquals(messageOf({ status: { message: "m" } }), "m");
  assertEquals(messageOf({ status: 404, message: "n" }), "n");
  assertEquals(messageOf(null), undefined);
  assertEquals(codeOf({ status: { code: 400 } }), 400);
  assertEquals(codeOf({ status: 404 }), 404);
  assertEquals(dataOf({ data: [1] }), {});
  assertEquals(dataOf({ data: { a: 1 } }), { a: 1 });
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: false }), { a: 1, e: false });
  assertEquals(parseJson('{"a":1}', "x"), { a: 1 });
  assertThrows(() => parseJson("{", "x"), Error, "x is not valid JSON");
  assertThrows(() => requireObject("[]", "filters"), Error, "filters must be an object");
  assertEquals(emailOptions({}), undefined);
  assertEquals(emailOptions({ acceptWork: false }), { accept_work: false });
});
