import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-habit.ts";

Deno.test("get-habit: GETs /habit/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "habit-1", name: "Read" } }]);
  const out = await action.execute!({ habitId: "habit-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/habit/habit-1");
  assertEquals(out, { id: "habit-1", name: "Read" });
});

Deno.test("get-habit: the habit id is encoded", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute!({ habitId: "../checkins" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/habit/..%2Fcheckins");
});

Deno.test("get-habit: requires the habit id and points at the check-in action", () => {
  assert(action.params!.find((p) => p.key === "habitId")?.required);
  assert(`${action.description}`.includes("Check-Ins"));
});
