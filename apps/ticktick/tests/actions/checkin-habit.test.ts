import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/checkin-habit.ts";

Deno.test("checkin-habit: POSTs /habit/{id}/checkin with the stamp as an integer", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { habitId: "habit-1", year: 2026, checkins: [{ stamp: 20260407 }] },
  }]);
  const out = await action.execute!({ habitId: "habit-1", stamp: 20260407, value: 1 }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/habit/habit-1/checkin");
  assertEquals(JSON.parse(calls[0].body!), { stamp: 20260407, value: 1 });
  assertEquals((out as { year: number }).year, 2026);
});

Deno.test("checkin-habit: the stamp is a number on the wire, not a date string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ habitId: "habit-1", stamp: 20260407 }, ctx);
  assertEquals(typeof JSON.parse(calls[0].body!).stamp, "number");
});

Deno.test("checkin-habit: time and opTime ARE converted — they are timestamps, not stamps", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    habitId: "habit-1",
    stamp: 20260407,
    time: "2026-04-07T08:00:00Z",
    opTime: "2026-04-07T08:05:00+02:00",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.stamp, 20260407);
  assertEquals(body.time, "2026-04-07T08:00:00+0000");
  assertEquals(body.opTime, "2026-04-07T08:05:00+0200");
});

Deno.test("checkin-habit: idempotent — the stamp is the key, so re-posting amends", () => {
  assertEquals(action.idempotent, true);
  const stamp = action.params!.find((p) => p.key === "stamp")!;
  assert(stamp.required);
  assertEquals(stamp.type, "number");
  assertEquals(stamp.validation?.integer, true);
});
