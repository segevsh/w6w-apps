import { assertEquals, assertRejects } from "@std/assert";
import { buildQuery, errorText, FullEnrichClient, jsonValue, strList } from "../../lib/client.ts";
import { mergeFilters, valueFilter } from "../../lib/search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: strList, jsonValue and buildQuery normalise form input", () => {
  assertEquals(strList("a, b,,"), ["a", "b"]);
  assertEquals(strList([]), undefined);
  assertEquals(jsonValue('{"a":1}'), { a: 1 });
  assertEquals(jsonValue("nope"), "nope");
  assertEquals(buildQuery({ a: 1, b: undefined, c: "", d: true }), "?a=1&d=true");
});

Deno.test("client: errors carry the vendor code and message", async () => {
  assertEquals(errorText({ code: "error.rate.limit", message: "slow" }), "slow (error.rate.limit)");
  const { ctx } = mockCtx([{
    status: 429,
    body: { code: "error.rate.limit", message: "Too many requests. Try again in 1m" },
  }]);
  await assertRejects(
    async () => await new FullEnrichClient(ctx).request("GET", "/account/credits"),
    Error,
    "HTTP 429 — Too many requests. Try again in 1m (error.rate.limit)",
  );
});

Deno.test("client: okStatuses returns the body instead of throwing", async () => {
  const { ctx } = mockCtx([{ status: 402, body: { status: "CREDITS_INSUFFICIENT" } }]);
  const out = await new FullEnrichClient(ctx).request("GET", "/x", { okStatuses: [402] });
  assertEquals(out, { status: "CREDITS_INSUFFICIENT" });
});

Deno.test("search: valueFilter wraps values and mergeFilters lets named params win", () => {
  assertEquals(valueFilter("a,b"), [{ value: "a" }, { value: "b" }]);
  assertEquals(valueFilter(undefined), undefined);
  assertEquals(
    mergeFilters('{"x":1,"names":[{"value":"raw"}]}', { names: [{ value: "n" }], y: undefined }),
    { x: 1, names: [{ value: "n" }] },
  );
});
