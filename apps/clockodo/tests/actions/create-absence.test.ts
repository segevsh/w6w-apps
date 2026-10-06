import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-absence.ts";
import { API_ROOT, bodyOf, exec, mockCtx } from "../_helpers.ts";

Deno.test("create-absence: POSTs /v4/absences with numeric type and status", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 21 } } }]);
  const out = await exec(action, {
    dateSince: "2026-10-12",
    dateUntil: "2026-10-14",
    type: "1",
    usersId: 4,
    halfDay: false,
    status: "1",
    note: "trip",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/v4/absences`);
  assertEquals(bodyOf(calls[0]), {
    date_since: "2026-10-12",
    date_until: "2026-10-14",
    type: 1,
    users_id: 4,
    half_day: false,
    status: 1,
    note: "trip",
  });
  assertEquals(out, { data: { id: 21 } });
});

Deno.test("create-absence: missing type or date is refused; a collision error surfaces", async () => {
  const none = mockCtx();
  await assertRejects(
    () => exec(action, { dateSince: "2026-10-12" }, none.ctx),
    Error,
    "type is required",
  );
  await assertRejects(() => exec(action, { type: "4" }, none.ctx), Error, "dateSince");
  assertEquals(none.calls.length, 0);
  const { ctx } = mockCtx([{
    status: 422,
    body: { errors: [{ type: "AbsenceCollision", message: "overlaps" }] },
  }]);
  await assertRejects(() => exec(action, { dateSince: "d", type: 4 }, ctx), Error, "overlaps");
});
