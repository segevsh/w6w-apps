import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asList,
  asObject,
  buildQuery,
  call,
  compact,
  flag,
  stageOf,
  toInt,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("asList: bare array, counted wrapper, deals wrapper, unknown shape", () => {
  assertEquals(asList([1, 2]), { items: [1, 2] });
  assertEquals(asList({ data: [1], total_items: 9 }), { items: [1], total: 9 });
  assertEquals(asList({ data: [1], total_deals: 4 }), { items: [1], total: 4 });
  assertEquals(asList({ weird: true }), { items: [], raw: { weird: true } });
});

Deno.test("asObject: objects pass through, anything else is wrapped", () => {
  assertEquals(asObject({ a: 1 }), { a: 1 });
  assertEquals(asObject([1]), { result: [1] });
});

Deno.test("helpers: toInt, flag, compact, buildQuery, stageOf", () => {
  assertEquals(toInt("7", "x"), 7);
  assertEquals(toInt("", "x"), undefined);
  assertThrows(() => toInt("a", "id"), Error, "must be an integer");
  assertEquals(flag(true), 1);
  assertEquals(flag(false), undefined);
  assertEquals(compact({ a: 1, b: "", c: null, d: 0 }), { a: 1, d: 0 });
  assertEquals(buildQuery({ a: 1, b: undefined }), "?a=1");
  assertEquals(buildQuery({}), "");
  assertEquals(stageOf({}), undefined);
  assertEquals(stageOf({ name: "Hired" }), { name: "Hired" });
});

Deno.test("call: no credentials on the request, JSON body, empty 2xx body is {}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const out = await call(ctx, "/x", { method: "POST", body: { a: 1 } });
  assertEquals(out, {});
  assertEquals(calls[0].headers["rf-api-key"], undefined);
  assertEquals(calls[0].headers["content-type"], "application/json");
});

Deno.test("call: non-JSON error body is surfaced truncated", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  await assertRejects(() => call(ctx, "/x"), Error, "HTTP 500): boom");
});
