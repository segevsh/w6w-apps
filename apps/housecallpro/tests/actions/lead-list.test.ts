import { assertEquals } from "@std/assert";
import leadList from "../../actions/lead-list.ts";
import { mockCtx, page, pathOf, queryAll, queryOf } from "../_helpers.ts";

Deno.test("lead-list: calls GET /leads", async () => {
  const { ctx, calls } = mockCtx([{ body: page("leads", [{ id: "l1" }]) }]);
  const out = await leadList.execute({ status: "open" }, ctx);

  assertEquals(pathOf(calls[0].url), "/leads");
  assertEquals(queryOf(calls[0].url), { status: "open" });
  assertEquals(out.items, [{ id: "l1" }]);
});

Deno.test("lead-list: status is scalar while tag_ids and lead_source are arrays", async () => {
  const { ctx, calls } = mockCtx([{ body: page("leads", []) }]);
  await leadList.execute({ status: "won", tagIds: "t1,t2", leadSource: "Referral" }, ctx);

  assertEquals(queryOf(calls[0].url).status, "won");
  assertEquals(queryAll(calls[0].url, "status[]"), []);
  assertEquals(queryAll(calls[0].url, "tag_ids[]"), ["t1", "t2"]);
  assertEquals(queryAll(calls[0].url, "lead_source[]"), ["Referral"]);
});
