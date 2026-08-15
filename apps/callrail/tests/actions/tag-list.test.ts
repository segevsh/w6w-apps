import { assertEquals } from "@std/assert";
import tagList from "../../actions/tag-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tag-list: hits tags.json and forwards company/status/tag_level filters", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope("tags", [{ id: 1, name: "Sales" }]) }]);
  const out = await tagList.execute(
    { accountId: "ACC1", companyId: "COM1", status: "enabled", tagLevel: "company" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/tags.json");
  const q = queryOf(calls[0].url);
  assertEquals(q.company_id, "COM1");
  assertEquals(q.status, "enabled");
  assertEquals(q.tag_level, "company");
  assertEquals(out.tags, [{ id: 1, name: "Sales" }]);
});
