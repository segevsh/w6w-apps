import { assertEquals } from "@std/assert";
import action from "../../actions/candidate-list.ts";
import { mockCtx } from "../_helpers.ts";

type Rec = Record<string, unknown>;

Deno.test("candidate-list: filters by stage", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ _id: "k1" }] }]);
  const out = await action.execute!({ companyId: "c1", positionId: "p1", stageId: "applied" }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.breezy.hr/v3/company/c1/position/p1/candidates?stage_id=applied",
  );
  assertEquals(out, { candidates: [{ _id: "k1" }] });
});

Deno.test("candidate-list: paged mode sends page_size/page/sort and reports nextPage", async () => {
  const { ctx, calls } = mockCtx([{ body: [{}, {}] }]);
  const out = await action.execute!(
    { companyId: "c1", positionId: "p1", pageSize: 2, page: 1, sort: "updated" },
    ctx,
  );
  assertEquals(
    calls[0].url,
    "https://api.breezy.hr/v3/company/c1/position/p1/candidates?page_size=2&page=1&sort=updated",
  );
  assertEquals((out as Rec).nextPage, 2);
});
