import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-completed-tasks.ts";

Deno.test("list-completed-tasks: POSTs /task/completed and unwraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "T1", status: 2 }] }]);
  const out = await action.execute!(
    { projectIds: ["P1"], startDate: "2026-03-01T00:00:00Z", endDate: "2026-03-05T00:00:00Z" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/task/completed");
  assertEquals(JSON.parse(calls[0].body!), {
    projectIds: ["P1"],
    startDate: "2026-03-01T00:00:00+0000",
    endDate: "2026-03-05T00:00:00+0000",
  });
  assertEquals(out, { items: [{ id: "T1", status: 2 }], count: 1 });
});

Deno.test("list-completed-tasks: every field is optional", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
  for (const p of action.params!) assertEquals(p.required, undefined, `${p.key}`);
});

Deno.test("list-completed-tasks: its date hints say completion, not start", () => {
  const from = action.params!.find((p) => p.key === "startDate")!;
  assert(from.hint!.includes("completedTime"));
  assertEquals(from.label, "Completed from");
});
