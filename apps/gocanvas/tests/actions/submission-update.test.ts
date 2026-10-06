import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/submission-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("submission-update: PATCH /api/v3/submissions/691911 with the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { "id": 691911 } }]);
  const out = await action.execute(
    {
      "submissionId": 691911,
      "editGuid": "E-1",
      "responses": [{ "value_id": 641347, "value": "Done" }],
    } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v3/submissions/691911");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(bodyOf(calls[0]), {
    "submission": { "id": 691911 },
    "edit_guid": "E-1",
    "responses": [{ "value_id": 641347, "value": "Done" }],
  });
  assertEquals(out, { "id": 691911 });

  // Unassign is a deliberate blank: it must reach the wire as null, not be compacted away.
  const un = mockCtx([{ body: {} }]);
  await action.execute({ submissionId: 5, unassign: true }, un.ctx);
  assertEquals(bodyOf(un.calls[0]), {
    submission: { id: 5 },
    next_assigned_workflow_user_id: null,
  });
  const wf = mockCtx([{ body: {} }]);
  await action.execute(
    { submissionId: 5, workflow: '{"handoff_id":2,"handoff_user_id":3}' },
    wf.ctx,
  );
  assertEquals(bodyOf(wf.calls[0]).workflow, { handoff_id: 2, handoff_user_id: 3 });
  await assertRejects(
    async () => await action.execute({ submissionId: 5 }, mockCtx().ctx),
    Error,
    "needs",
  );
  await assertRejects(
    async () =>
      await action.execute({ submissionId: 5, assignToUserId: 1, unassign: true }, mockCtx().ctx),
    Error,
    "cannot be combined",
  );
});
