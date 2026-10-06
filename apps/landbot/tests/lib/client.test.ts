import { assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  encodeId,
  errorText,
  LandbotClient,
  queryString,
  redactToken,
  toArray,
  toObject,
  toStringList,
} from "../../lib/client.ts";
import { bodyParams, coerceValue, fieldBody, fieldPath } from "../../lib/fields.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

Deno.test("client: errorText flattens the errors map and the DRF detail", () => {
  assertEquals(errorText({ detail: "Invalid token." }), "Invalid token.");
  assertEquals(
    errorText({ errors: { message: ["required", "too long"], url: ["bad"] } }),
    "message: required, too long; url: bad",
  );
  assertEquals(errorText("nope"), undefined);
});

Deno.test("client: redactToken hides a non-empty token and leaves the rest", () => {
  assertEquals(redactToken({ id: 1, token: "abc" }), { id: 1, token: "[redacted]" });
  assertEquals(redactToken({ id: 1, token: null }), { id: 1, token: null });
  assertEquals(redactToken({ id: 1 }), { id: 1 });
});

Deno.test("client: list computes nextOffset from total and offset", async () => {
  const more = mockCtx([{ body: { success: true, total: 5, customers: [{}, {}] } }]);
  const r = await new LandbotClient(more.ctx).list("/customers/", "customers", {
    query: { offset: 2, limit: 2 },
  });
  assertEquals(r.nextOffset, 4);
  assertEquals(queryOf(more.calls[0].url), { offset: "2", limit: "2" });
  const last = mockCtx([{ body: { success: true, total: 4, customers: [{}, {}] } }]);
  assertEquals(
    (await new LandbotClient(last.ctx).list("/customers/", "customers", { query: { offset: 2 } }))
      .nextOffset,
    null,
  );
});

Deno.test("client: list and get reject a body without the documented key", async () => {
  await assertRejects(
    () => new LandbotClient(mockCtx([{ body: { nope: 1 } }]).ctx).list("/x/", "customers"),
    Error,
    "expected a",
  );
  await assertRejects(
    () => new LandbotClient(mockCtx([{ body: { nope: 1 } }]).ctx).get("/x/", "customer"),
    Error,
    "expected a",
  );
});

Deno.test("client: done tolerates an empty 200, a 204 and a non-JSON 200, and merges an object", async () => {
  for (const r of [{ status: 200 }, { status: 204 }, { status: 200, body: "OK", headers: {} }]) {
    assertEquals(await new LandbotClient(mockCtx([r]).ctx).done("/x/"), { ok: true });
  }
  assertEquals(
    await new LandbotClient(mockCtx([{ body: { success: true } }]).ctx).done("/x/"),
    { ok: true, success: true },
  );
});

Deno.test("client: a non-JSON error body falls back to the text", async () => {
  await assertRejects(
    () =>
      new LandbotClient(mockCtx([{ status: 502, body: "Bad gateway", headers: {} }]).ctx).done(
        "/x/",
      ),
    Error,
    "Landbot 502: Bad gateway",
  );
});

Deno.test("client: helpers", () => {
  assertEquals(encodeId(" a/b "), "a%2Fb");
  assertEquals(compact({ a: 1, b: "", c: null, d: false }), { a: 1, d: false });
  assertEquals(queryString({ a: "x y", b: undefined }), "?a=x+y");
  assertEquals(toStringList("a, b,,c"), ["a", "b", "c"]);
  assertEquals(toStringList(undefined), []);
  assertEquals(toObject('{"a":1}', "x"), { a: 1 });
  assertEquals(toObject(undefined, "x"), undefined);
  assertEquals(toArray("[1]", "x"), [1]);
  for (const f of [() => toObject("[]", "x"), () => toObject("{", "x"), () => toArray("{}", "x")]) {
    try {
      f();
      throw new Error("should have thrown");
    } catch (e) {
      assertEquals((e as Error).message.startsWith("Landbot:"), true);
    }
  }
});

Deno.test("fields: names are validated, values coerced by type", () => {
  assertEquals(fieldPath(" plan_2 "), "plan_2");
  for (const bad of ["Plan", "a-b", "", "a/b"]) {
    try {
      fieldPath(bad);
      throw new Error("should have thrown");
    } catch (e) {
      assertEquals((e as Error).message.includes("invalid"), true, bad);
    }
  }
  assertEquals(coerceValue("integer", "7"), 7);
  assertEquals(coerceValue("float", "1.5"), 1.5);
  assertEquals(coerceValue("boolean", "TRUE"), true);
  assertEquals(coerceValue("boolean", false), false);
  assertEquals(coerceValue("date", "2026-10-06"), "2026-10-06");
  assertEquals(coerceValue("string", 5), 5);
  for (
    const [t, v] of [["integer", "1.5"], ["float", "x"], ["integer", ""], ["boolean", "maybe"]]
  ) {
    try {
      coerceValue(t, v);
      throw new Error("should have thrown");
    } catch (e) {
      assertEquals((e as Error).message.startsWith("Landbot:"), true, `${t} ${v}`);
    }
  }
  assertEquals(fieldBody({ type: "string", value: "x" }), { type: "string", value: "x" });
  assertEquals(bodyParams('["a","b"]'), ["a", "b"]);
  assertEquals(bodyParams("a, b"), ["a", "b"]);
  assertEquals(bodyParams("[oops"), ["[oops"]);
  assertEquals(bodyParams(undefined), []);
});
