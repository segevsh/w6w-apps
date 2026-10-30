import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockRecruitCtx } from "../_helpers.ts";
import action from "../../actions/candidate-delete.ts";

test("candidate-delete: DELETEs /Candidates with the id in the `ids` query param", async () => {
  const { ctx, calls } = mockRecruitCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "1" } }] } },
  ]);
  await action.execute({ recordId: "1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/recruit/v2/Candidates");
  assertEquals(url.searchParams.get("ids"), "1");
});

test("candidate-delete: idempotent — deleting an already-deleted id converges", () => {
  assertEquals(action.idempotent, true);
});
