import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/visit-list.ts";

Deno.test("visit-list: filters by job ids, assignee and start window", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { visits: { nodes: [] } } } }]);
  await action.execute({
    jobIds: "j1,j2",
    assignedTo: "u1",
    status: "TODAY",
    startAfter: "2026-08-03T00:00:00Z",
    timezone: "America/Denver",
  }, ctx);
  const vars = JSON.parse(calls[0].body!).variables;
  assertEquals(vars.filter, {
    jobIds: ["j1", "j2"],
    assignedTo: "u1",
    status: "TODAY",
    startAt: { after: "2026-08-03T00:00:00Z" },
  });
  assertEquals(vars.timezone, "America/Denver");
});

Deno.test("visit-list: default sort is start time ascending", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { visits: { nodes: [] } } } }]);
  await action.execute({ sortKey: "START_AT" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.sort, [
    { key: "START_AT", direction: "ASCENDING" },
  ]);
});

Deno.test("visit-list: visit statuses are UPPER-case, unlike quotes and jobs", () => {
  const status = action.params?.find((p) => p.key === "status");
  const values = (status?.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values.every((v) => v === v.toUpperCase()), true);
  assert(values.includes("UNSCHEDULED"));
});
