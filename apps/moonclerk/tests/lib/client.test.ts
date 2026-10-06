import { assertEquals, assertRejects } from "@std/assert";
import { buildQuery, isAccessDenied, MoonClerkClient, seg } from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("buildQuery: skips unset, null and empty values", () => {
  assertEquals(buildQuery({ a: 1, b: undefined, c: null, d: "", e: "x y" }), "?a=1&e=x+y");
  assertEquals(buildQuery(undefined), "");
  assertEquals(buildQuery({}), "");
});

Deno.test("seg: percent-encodes a path segment", () => {
  assertEquals(seg("a/b"), "a%2Fb");
  assertEquals(seg(12), "12");
});

Deno.test("isAccessDenied: case-insensitive match on the vendor text", () => {
  assertEquals(isAccessDenied("HTTP Token: Access denied.\n"), true);
  assertEquals(isAccessDenied("<html>"), false);
});

Deno.test("get: a non-JSON 200 body is reported", async () => {
  const { ctx } = mockCtx([{ body: "<html>shell</html>" }]);
  await assertRejects(() => new MoonClerkClient(ctx).get("/forms"), Error, "non-JSON");
});

Deno.test("list: a missing envelope key yields an empty list", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const page = await new MoonClerkClient(ctx).list("/forms", "forms", {});
  assertEquals(page, { items: [] });
});
