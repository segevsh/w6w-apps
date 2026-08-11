import { assertEquals } from "@std/assert";
import leadSourceList from "../../actions/lead-source-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("lead-source-list: calls GET /lead_sources", async () => {
  const { ctx, calls } = mockCtx([
    { body: page("lead_sources", [{ id: "ls1", name: "Referral", editable: false }]) },
  ]);
  const out = await leadSourceList.execute({ q: "Ref" }, ctx);

  assertEquals(pathOf(calls[0].url), "/lead_sources");
  assertEquals(queryOf(calls[0].url), { q: "Ref" });
  assertEquals(out.items.length, 1);
});
