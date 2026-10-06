import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/search-technologies.ts";
import { exec, mockCtx } from "../_helpers.ts";

Deno.test("search-technologies: GETs the autocomplete and wraps data", async () => {
  const data = [{ slug: "salesforce", name: "Salesforce" }];
  const { ctx, calls } = mockCtx([{ body: { status: { code: 200, message: "OK" }, data } }]);
  const out = await exec(action, { query: "sales" }, ctx);
  assertEquals(calls[0].url, "https://wiza.co/api/meta/technology_autocomplete?query=sales");
  assertEquals(out, { technologies: data });
});

Deno.test("search-technologies: blank or short queries are refused locally; no data is an empty list", async () => {
  const none = mockCtx();
  await assertRejects(() => exec(action, { query: "   " }, none.ctx), Error, "at least 3");
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{ body: { status: { code: 200 } } }]);
  assertEquals(await exec(action, { query: "zzz" }, ctx), { technologies: [] });
});
