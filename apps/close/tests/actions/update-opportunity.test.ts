import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-opportunity.ts";

Deno.test("update-opportunity: PUTs /opportunity/{id}/ with only what changed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "oppo_1" } }]);
  await action.execute({ opportunityId: "oppo_1", statusId: "stat_won" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/opportunity/oppo_1/");
  assertEquals(JSON.parse(calls[0].body!), { status_id: "stat_won" });
});

Deno.test("update-opportunity: can backfill date_won for a historical close", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute(
    { opportunityId: "oppo_1", statusId: "stat_won", dateWon: "2026-01-15" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).date_won, "2026-01-15");
});

Deno.test("update-opportunity: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
