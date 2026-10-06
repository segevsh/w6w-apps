import { assertEquals } from "@std/assert";
import templateList from "../../actions/template-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("template-list: GETs /template with count and max_version", async () => {
  const body = {
    data: [{ id: "t-1", version: 5, template_type: "html_css" }],
    pagination: { next_page_start: 4 },
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await templateList.execute({ count: 3, max_version: 9 }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/template");
  assertEquals(queryOf(calls[0].url), { count: "3", max_version: "9" });
  assertEquals(out, body);
});

Deno.test("template-list: no params means no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], pagination: { next_page_start: null } } }]);
  await templateList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
