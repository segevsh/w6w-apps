import { assertEquals } from "@std/assert";
import milestoneCreate from "../../actions/milestone-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("milestone-create - POSTs /milestones with the datetime-string date field", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { milestone_id: 9, name: "Sprint #14" } }]);
  const out = await milestoneCreate.execute(
    { name: "Sprint #14", projectId: 1, date: "2025-12-01 09:00" },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v3/milestones");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.date, "2025-12-01 09:00");
  assertEquals(body.project_id, 1);
  assertEquals(out, { milestone_id: 9, name: "Sprint #14" });
});
