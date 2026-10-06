import { assertEquals, assertRejects } from "@std/assert";
import { mockPeopleCtx } from "../_helpers.ts";
import action from "../../actions/leave-cancel.ts";

Deno.test("leave-cancel: PATCHes the v2 cancel endpoint with the reason", async () => {
  const { ctx, calls } = mockPeopleCtx([{
    body: { message: "Leave Cancelled", status: "success" },
  }]);
  const out = await action.execute(
    { recordId: "413124000068132003", reason: "Rescheduling" },
    ctx,
  ) as { status: string; message: string };
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(url.pathname, "/api/v2/leavetracker/leaves/records/cancel/413124000068132003");
  assertEquals(url.searchParams.get("reason"), "Rescheduling");
  assertEquals(out, { status: "success", message: "Leave Cancelled" });
});

Deno.test("leave-cancel: the v2 error shape (no response wrapper) is surfaced", async () => {
  const { ctx } = mockPeopleCtx([{
    status: 401,
    body: { error: { code: 7213, message: "The provided OAuth token is invalid." } },
  }]);
  await assertRejects(
    () => action.execute({ recordId: "1" }, ctx) as Promise<unknown>,
    Error,
    "7213",
  );
});

Deno.test("leave-cancel: rejects a non-numeric record id; idempotent", async () => {
  const { ctx, calls } = mockPeopleCtx([]);
  await assertRejects(
    () => action.execute({ recordId: "1/../x" }, ctx) as Promise<unknown>,
    Error,
    "numeric",
  );
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, true);
});
