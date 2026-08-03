import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-habit.ts";

Deno.test("create-habit: a name-only call sends a one-field body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "habit-1" } }]);
  await action.execute!({ name: "Read" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/habit");
  assertEquals(JSON.parse(calls[0].body!), { name: "Read" });
});

Deno.test("create-habit: sends the documented writable fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({
    name: "Read",
    iconRes: "habit_reading",
    color: "#4D8CF5",
    type: "Boolean",
    goal: 1,
    step: 1,
    unit: "Count",
    repeatRule: "RRULE:FREQ=DAILY;INTERVAL=1",
    recordEnable: false,
    targetStartDate: 20240101,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Read",
    iconRes: "habit_reading",
    color: "#4D8CF5",
    type: "Boolean",
    goal: 1,
    step: 1,
    unit: "Count",
    repeatRule: "RRULE:FREQ=DAILY;INTERVAL=1",
    recordEnable: false,
    targetStartDate: 20240101,
  });
});

Deno.test("create-habit: never sends read-only members of OpenHabit", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!(
    { name: "Read", id: "x", totalCheckIns: 9, etag: "e" } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { name: "Read" });
});

Deno.test("create-habit: enforces TickTick's documented 1000-character name limit", () => {
  const name = action.params!.find((p) => p.key === "name")!;
  assert(name.required);
  assertEquals(name.validation?.maxLength, 1000);
  assertEquals(action.idempotent, false);
});
