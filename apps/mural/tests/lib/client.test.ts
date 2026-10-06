import { assertEquals, assertThrows } from "@std/assert";
import {
  buildUrl,
  call,
  encodeId,
  first,
  jsonFields,
  list,
  parseJsonField,
} from "../../lib/client.ts";
import { jsonBody, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("encodeId: trims, encodes and refuses empty", () => {
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertThrows(() => encodeId(""));
  assertThrows(() => encodeId(undefined));
});

Deno.test("buildUrl: skips unset query values", () => {
  assertEquals(
    buildUrl("/x", { a: 1, b: "", c: undefined, d: null }),
    "https://app.mural.co/api/public/v1/x?a=1",
  );
});

Deno.test("call: array query values are comma-joined and the body is sent as JSON", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: {} } }]);
  await call(ctx, "POST", "/x", { query: { type: ["a", "b"] }, body: { k: 1 } });
  assertEquals(queryOf(calls[0].url), { type: "a,b" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(jsonBody(calls[0]), { k: 1 });
});

Deno.test("list: omits next on the last page; first: unwraps one array element", async () => {
  const a = mockCtx([{ body: { value: [1] } }]);
  assertEquals(await list(a.ctx, "GET", "/x"), { items: [1] });
  const b = mockCtx([{ body: { value: [{ id: "w" }] } }]);
  assertEquals(await first(b.ctx, "POST", "/x"), { id: "w" });
});

Deno.test("call: a non-JSON error body still produces a readable error", async () => {
  const { ctx } = mockCtx([{ status: 502, body: "Bad gateway" }]);
  const err = await call(ctx, "GET", "/x").catch((e) => e as Error);
  assertEquals((err as Error).message.includes("Bad gateway"), true);
});

Deno.test("parseJsonField/jsonFields: parse text, pass data, reject garbage", () => {
  assertEquals(parseJsonField("s", '{"a":1}'), { a: 1 });
  assertEquals(parseJsonField("s", { a: 1 }), { a: 1 });
  assertThrows(() => parseJsonField("style", "{nope"), Error, "style must be valid JSON");
  assertEquals(jsonFields({ style: '["t"]', x: 1 }, ["style"]), { style: ["t"], x: 1 });
});
