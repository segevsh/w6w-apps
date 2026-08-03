import { assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/search-tasks.ts";

Deno.test("search-tasks: POSTs to /tasks/search", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({}, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/tasks/search");
});

Deno.test("search-tasks: maps every filter onto Copper's body keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute({
    ids: [1, 2],
    assigneeIds: [-2],
    opportunityIds: [4417020],
    projectIds: [208105],
    statuses: ["Open"],
    tags: ["urgent"],
    minimumDueDate: 1,
    maximumDueDate: 2,
    minimumModifiedDate: 3,
    maximumModifiedDate: 4,
    sortBy: "due_date",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    ids: [1, 2],
    assignee_ids: [-2],
    opportunity_ids: [4417020],
    project_ids: [208105],
    statuses: ["Open"],
    tags: ["urgent"],
    minimum_due_date: 1,
    maximum_due_date: 2,
    minimum_modified_date: 3,
    maximum_modified_date: 4,
    sort_by: "due_date",
  });
});

Deno.test("search-tasks: statuses are the plain strings, not numeric ids", () => {
  // Tasks are the one resource whose search filter shares the record's own
  // vocabulary; Opportunities and Leads use numeric ids instead.
  assertEquals(optionValues(action, "statuses"), ["Open", "Completed"]);
});
