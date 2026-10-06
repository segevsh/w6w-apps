import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/selected-multiple-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("selected-multiple-get: repeats the selectors key (never selectors[]) and counts results", async () => {
  const body = [["Example"], ["a", "b"], []];
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await action.execute({ url: "https://e.test", selectors: "h1\n p \n.x" }, ctx);
  assertEquals(out, { results: body, count: 3 });
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/selected-multiple");
  assertEquals(u.searchParams.getAll("selectors"), ["h1", "p", ".x"]);
  assertEquals(u.searchParams.has("selectors[]"), false);
});

Deno.test("selected-multiple-get: accepts an array; empty selectors and a non-array body are errors", async () => {
  const { ctx, calls } = mockCtx([{ body: [["x"]] }]);
  await action.execute({ url: "https://e.test", selectors: ["h1"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.getAll("selectors"), ["h1"]);
  const none = mockCtx();
  await assertRejects(
    async () => await action.execute({ url: "https://e.test", selectors: " \n " }, none.ctx),
    Error,
    "At least one",
  );
  assertEquals(none.calls.length, 0);
  const odd = mockCtx([{ body: { not: "an array" } }]);
  await assertRejects(
    async () => await action.execute({ url: "https://e.test", selectors: "h1" }, odd.ctx),
    Error,
    "expected an array",
  );
});
