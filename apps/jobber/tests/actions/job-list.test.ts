import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/job-list.ts";

Deno.test("job-list: the scheduling window maps to visitsScheduledBetween", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { jobs: { nodes: [] } } } }]);
  await action.execute({
    visitsScheduledAfter: "2026-08-01T00:00:00Z",
    visitsScheduledBefore: "2026-08-08T00:00:00Z",
    visitsAssignedToUserId: "u1",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.filter, {
    visitsAssignedToUserId: "u1",
    visitsScheduledBetween: {
      after: "2026-08-01T00:00:00Z",
      before: "2026-08-08T00:00:00Z",
    },
  });
});

Deno.test("job-list: ids are split into a list for a batch fetch", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { jobs: { nodes: [] } } } }]);
  await action.execute({ ids: "j1,j2 , j3" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.filter.ids, ["j1", "j2", "j3"]);
});

Deno.test("job-list: `includeUnscheduled: false` survives compaction", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { jobs: { nodes: [] } } } }]);
  await action.execute({ includeUnscheduled: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).variables.filter, { includeUnscheduled: false });
});
