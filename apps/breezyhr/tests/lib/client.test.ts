import { assertEquals, assertRejects } from "@std/assert";
import {
  BreezyClient,
  buildQuery,
  candidate,
  compact,
  compactOrUndefined,
  errorText,
  jsonValue,
  strList,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("buildQuery: skips unset and empty values", () => {
  assertEquals(buildQuery({ a: 1, b: "", c: undefined, d: null, e: false }), "?a=1&e=false");
  assertEquals(buildQuery(undefined), "");
});

Deno.test("strList / jsonValue / compact helpers", () => {
  assertEquals(strList(" a, ,b "), ["a", "b"]);
  assertEquals(strList([]), undefined);
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue("not json"), "not json");
  assertEquals(jsonValue("  "), undefined);
  assertEquals(compact({ a: undefined, b: "", c: 0 }), { b: "", c: 0 });
  assertEquals(compactOrUndefined({ a: undefined }), undefined);
});

Deno.test("errorText: type and message, falling back to the raw text", () => {
  assertEquals(errorText({ error: { type: "t", message: "m" } }), "t: m");
  assertEquals(errorText(undefined, "  <html>boom "), "<html>boom");
});

Deno.test("path builders percent-encode every segment", () => {
  assertEquals(candidate("c/1", "p 2", "k"), "/company/c%2F1/position/p%202/candidate/k");
});

Deno.test("client: an empty 204 body is {} and a non-JSON failure keeps the raw text", async () => {
  const ok = new BreezyClient(mockCtx([{ status: 204 }]).ctx);
  assertEquals(await ok.request("PUT", "/x"), {});
  const bad = new BreezyClient(mockCtx([{ status: 502, body: "bad gateway" }]).ctx);
  await assertRejects(async () => await bad.request("GET", "/x"), Error, "HTTP 502 — bad gateway");
});
