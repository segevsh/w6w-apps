import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-habit-checkins.ts";

Deno.test("list-habit-checkins: habitIds is ONE comma-separated parameter, not repeated", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ habitId: "habit-1", year: 2026 }] }]);
  const out = await action.execute!(
    { habitIds: ["habit-1", "habit-2"], from: 20260401, to: 20260407 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/open/v1/habit/checkins");
  assertEquals(url.searchParams.getAll("habitIds"), ["habit-1,habit-2"]);
  assertEquals(url.searchParams.get("from"), "20260401");
  assertEquals(url.searchParams.get("to"), "20260407");
  assertEquals(out, { items: [{ habitId: "habit-1", year: 2026 }], count: 1 });
});

Deno.test("list-habit-checkins: blank and whitespace ids are dropped from the join", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ habitIds: [" habit-1 ", "", "habit-2"], from: 1, to: 2 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("habitIds"), "habit-1,habit-2");
});

Deno.test("list-habit-checkins: the date bounds are YYYYMMDD integers, not timestamps", () => {
  for (const key of ["from", "to"]) {
    const p = action.params!.find((x) => x.key === key)!;
    assertEquals(p.type, "number", `${key} must be a number`);
    assertEquals(p.validation?.integer, true);
    assert(p.hint!.includes("YYYYMMDD"));
  }
});

Deno.test("list-habit-checkins: all three parameters are required", () => {
  for (const key of ["habitIds", "from", "to"]) {
    assert(action.params!.find((p) => p.key === key)?.required, `${key} must be required`);
  }
});
