import { assertEquals, assertRejects } from "@std/assert";
import templateVersionsList from "../../actions/template-versions-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("template-versions-list: GETs /template/{id} and pages with max_version", async () => {
  const body = {
    data: [{ id: "t-1", version: 2 }, { id: "t-1", version: 1 }],
    pagination: { next_page_start: null },
  };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await templateVersionsList.execute(
    { template_id: "t-1", count: 2, max_version: 7 },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/template/t-1");
  assertEquals(queryOf(calls[0].url), { count: "2", max_version: "7" });
  assertEquals(out, body);
});

Deno.test("template-versions-list: requires template_id", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await templateVersionsList.execute({ template_id: "" }, ctx),
    Error,
    "template_id",
  );
  assertEquals(calls.length, 0);
});
