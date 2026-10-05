import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx, pathOf } from "../_helpers.ts";
import leaveRequestUpdate from "../../actions/leave-request-update.ts";

Deno.test("leave-request-update: PATCHes /leave-requests/<id>/ to approve with reviewer fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "lr1", status: "APPROVED" } }]);
  await leaveRequestUpdate.execute(
    { id: "lr1", status: "APPROVED", reviewerId: "w9", reviewedAt: "2026-11-01T10:00:00Z" },
    ctx,
  );

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/leave-requests/lr1/");
  assertEquals(JSON.parse(calls[0].body!), {
    status: "APPROVED",
    reviewer_id: "w9",
    reviewed_at: "2026-11-01T10:00:00Z",
  });
});

Deno.test("leave-request-update: nothing is required on a PATCH but an id and one change", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(
    leaveRequestUpdate.params!.filter((p) => p.key !== "id").some((p) => p.required),
    false,
  );
  await assertRejects(
    () => Promise.resolve().then(() => leaveRequestUpdate.execute({ id: "lr1" }, ctx)),
    Error,
    "at least one field",
  );
  assertEquals(calls.length, 0);
  assertEquals(leaveRequestUpdate.idempotent, true);
});
