import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/filter-tasks.ts";

Deno.test("filter-tasks: POSTs /task/filter and unwraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "T1" }, { id: "T2" }] }]);
  const out = await action.execute!({ projectIds: ["P1"], status: [0] }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/open/v1/task/filter");
  assertEquals(JSON.parse(calls[0].body!), { projectIds: ["P1"], status: [0] });
  assertEquals(out, { items: [{ id: "T1" }, { id: "T2" }], count: 2 });
});

Deno.test("filter-tasks: sends `priority`, NOT the doc table's `proiority` typo", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ priority: [1, 5] }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.priority, [1, 5]);
  assert(!("proiority" in body), "the doc's typo must not reach the wire");
});

Deno.test("filter-tasks: dates go out in TickTick's numeric-offset format", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!(
    { startDate: "2026-03-01T00:58:20.000Z", endDate: "2026-03-05T10:00:00Z" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), {
    startDate: "2026-03-01T00:58:20+0000",
    endDate: "2026-03-05T10:00:00+0000",
  });
});

Deno.test("filter-tasks: an all-empty call sends `{}` — every field is optional", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({}, ctx);
  assertEquals(JSON.parse(calls[0].body!), {});
});

Deno.test("filter-tasks: the tag filter keeps TickTick's singular name", () => {
  assert(action.params!.some((p) => p.key === "tag"));
  assert(!action.params!.some((p) => p.key === "tags"));
});

Deno.test("filter-tasks: status options are the TASK scale (0/2), not the subtask scale (0/1)", () => {
  const status = action.params!.find((p) => p.key === "status")!;
  assertEquals((status.options as Array<{ value: unknown }>).map((o) => o.value), [0, 2]);
});
