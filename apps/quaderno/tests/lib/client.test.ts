import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx, mockQuadernoCtx } from "../_helpers.ts";
import { compact, csv, jsonParam, QuadernoClient } from "../../lib/client.ts";

Deno.test("client: refuses a connection with no account", () => {
  assertThrows(
    () => new QuadernoClient(mockCtx().ctx),
    Error,
    "Quaderno connection has no account",
  );
});

Deno.test("client: never sets Authorization and asks for JSON", async () => {
  const { ctx, calls } = mockQuadernoCtx([{ body: { id: 1 } }]);
  await new QuadernoClient(ctx).request("/contacts/1");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("client: a failure carries the vendor's error body", async () => {
  const { ctx } = mockQuadernoCtx([{ status: 422, body: { error: "bad" } }]);
  await assertRejects(
    () => new QuadernoClient(ctx).request("/invoices", { method: "POST", body: {} }),
    Error,
    "Quaderno 422",
  );
});

Deno.test("client: list reads X-Pages-HasMore and derives the next cursor", async () => {
  const { ctx } = mockQuadernoCtx([{
    headers: { "content-type": "application/json", "x-pages-hasmore": "true" },
    body: [{ id: 30 }, { id: 29 }],
  }]);
  assertEquals(await new QuadernoClient(ctx).list("/contacts", {}), {
    items: [{ id: 30 }, { id: 29 }],
    hasMore: true,
    nextCursor: 29,
  });
});

Deno.test("client: list on the last page has no cursor", async () => {
  const { ctx } = mockQuadernoCtx([{ body: [{ id: 1 }] }]);
  const page = await new QuadernoClient(ctx).list("/contacts", {});
  assertEquals(page.hasMore, false);
  assertEquals(page.nextCursor, undefined);
});

Deno.test("client: helpers drop blanks, split csv and parse json", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: null, e: 0 }), { a: 1, e: 0 });
  assertEquals(csv(" a, b ,,"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(jsonParam('{"x":1}', "p"), { x: 1 });
  assertEquals(jsonParam({ x: 1 }, "p"), { x: 1 });
  assertEquals(jsonParam("", "p"), undefined);
  assertThrows(() => jsonParam("{nope", "p"), Error, "`p` is not valid JSON.");
});
