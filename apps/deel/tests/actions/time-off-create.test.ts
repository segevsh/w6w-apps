import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/time-off-create.ts";

const display = {};

Deno.test("time-off-create: sends the three fields Deel's schema requires", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { time_offs: [] } }], { display });
  await action.execute!({
    recipientProfileId: "hp1",
    startDate: "2026-09-01",
    endDate: "2026-09-05",
  }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/time_offs");
  assertEquals(JSON.parse(calls[0].body!), {
    data: { recipient_profile_id: "hp1", start_date: "2026-09-01", end_date: "2026-09-05" },
  });
});

/** false is meaningful here — it means "skip Deel's approvers". */
Deno.test("time-off-create: the approval-flow flag survives when set to false", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], { display });
  await action.execute!({
    recipientProfileId: "hp1",
    startDate: "2026-09-01",
    endDate: "2026-09-05",
    useDeelApprovalFlow: false,
    status: "APPROVED",
  }, ctx);
  const data = JSON.parse(calls[0].body!).data;
  assertEquals(data.use_deel_approval_flow, false);
  assertEquals(data.status, "APPROVED");
});

Deno.test("time-off-create: all three required fields are enforced", async () => {
  for (
    const patch of [
      { startDate: "a", endDate: "b" },
      { recipientProfileId: "hp1", endDate: "b" },
      { recipientProfileId: "hp1", startDate: "a" },
    ]
  ) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(async () => await action.execute!(patch, ctx), Error);
    assertEquals(calls.length, 0);
  }
});
