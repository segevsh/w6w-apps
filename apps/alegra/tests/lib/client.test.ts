import { assertEquals, assertThrows } from "@std/assert";
import {
  AlegraClient,
  compact,
  errorText,
  formatAlegraError,
  idPath,
  jsonArray,
  jsonObject,
  listLimit,
  ref,
  stringList,
  toList,
} from "../../lib/client.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

Deno.test("toList: array, metadata envelope, and an unknown shape", () => {
  assertEquals(toList([1]), { items: [1], total: null });
  assertEquals(toList({ metadata: { total: "7" }, data: [1, 2] }), { items: [1, 2], total: 7 });
  assertEquals(toList({ data: [] }), { items: [], total: null });
  assertThrows(() => toList({ foo: 1 }), Error, "neither an array");
});

Deno.test("listLimit: accepts 1..30, rejects 0, 31 and non-integers", () => {
  assertEquals(listLimit(undefined), undefined);
  assertEquals(listLimit(30), 30);
  assertEquals(listLimit("5"), 5);
  for (const bad of [0, 31, 2.5, "x"]) assertThrows(() => listLimit(bad), Error, "limit must be");
});

Deno.test("errorText: reads error or message and appends the code", () => {
  assertEquals(errorText({ error: "boom", code: 400 }), "boom (code 400)");
  assertEquals(errorText({ message: "Unauthorized" }), "Unauthorized");
  assertEquals(errorText({ code: 1 }), undefined);
  assertEquals(errorText(null), undefined);
  assertEquals(errorText([1]), undefined);
});

Deno.test("formatAlegraError: JSON envelope, plain text, and truncation", () => {
  assertEquals(
    formatAlegraError(400, "POST", "/x", '{"error":"bad","code":400}'),
    "Alegra 400 for POST /x: bad (code 400)",
  );
  assertEquals(formatAlegraError(502, "GET", "/x", "gateway"), "Alegra 502 for GET /x: gateway");
  assertEquals(formatAlegraError(500, "GET", "/x", "z".repeat(3000)).length < 1100, true);
});

Deno.test("small helpers: compact, ref, idPath, stringList, jsonObject, jsonArray", () => {
  assertEquals(compact({ a: 0, b: "", c: null, d: undefined, e: false }), { a: 0, e: false });
  assertEquals(ref(5), { id: "5" });
  assertEquals(ref(""), undefined);
  assertEquals(idPath("a b/c"), "a%20b%2Fc");
  assertThrows(() => idPath(undefined), Error, "id is required");
  assertEquals(stringList("a, b,,"), ["a", "b"]);
  assertEquals(stringList(["x", " y "]), ["x", "y"]);
  assertEquals(stringList(undefined), []);
  assertEquals(jsonObject(undefined, "n"), {});
  assertEquals(jsonObject('{"a":1}', "n"), { a: 1 });
  assertThrows(() => jsonObject([], "n"), Error, "JSON object");
  assertEquals(jsonArray("", "n"), undefined);
  assertThrows(() => jsonArray("{}", "n"), Error, "JSON array");
});

Deno.test("AlegraClient: builds /api/v1 URLs, drops empty query values, tolerates an empty body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }, { body: { data: [] } }]);
  const client = new AlegraClient(ctx);
  assertEquals(await client.request("/x", { query: { a: "1", b: "", c: undefined } }), {});
  assertEquals(calls[0].url, "https://api.alegra.com/api/v1/x?a=1");
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  await client.list("/y", { start: 0 });
  assertEquals(queryOf(calls[1].url), { start: "0", metadata: "true" });
});
