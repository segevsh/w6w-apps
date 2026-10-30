import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import listTasks from "../../actions/list-tasks.ts";

test("list-tasks: passes every filter on the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await listTasks.execute({
    linkedObject: "people",
    linkedRecordId: "r1",
    assignee: "alice@attio.com",
    isCompleted: "false",
    sort: "created_at:desc",
    limit: 20,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/tasks");
  assertEquals(url.searchParams.get("linked_object"), "people");
  assertEquals(url.searchParams.get("linked_record_id"), "r1");
  assertEquals(url.searchParams.get("assignee"), "alice@attio.com");
  assertEquals(url.searchParams.get("is_completed"), "false");
  assertEquals(url.searchParams.get("sort"), "created_at:desc");
});

/**
 * The tri-state. An unchecked boolean would have sent `false` and silently
 * hidden every completed task, which is why this is a select whose empty option
 * is dropped by the client's query builder.
 */
test("list-tasks: the empty completion choice sends no is_completed at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await listTasks.execute({ isCompleted: "" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.has("is_completed"), false);
});

test("list-tasks: offers three completion states, not a boolean", () => {
  const p = param(listTasks, "isCompleted");
  assertEquals(p.type, "select");
  assertEquals(optionValues(listTasks, "isCompleted"), ["", "true", "false"]);
});

test("list-tasks: the sort enum is verbatim from the spec", () => {
  assertEquals(optionValues(listTasks, "sort"), [
    "created_at:asc",
    "created_at:desc",
    "completed_at:asc",
    "completed_at:desc",
  ]);
});

test("list-tasks: warns the default order is oldest-first", () => {
  assert(/oldest first/i.test(listTasks.description!), listTasks.description);
});

test("list-tasks: says the two linked_* params must be given together", () => {
  assert(/together/i.test(param(listTasks, "linkedObject").hint!));
  assert(/paired/i.test(param(listTasks, "linkedRecordId").hint!));
});

test("list-tasks: documents the literal `null` assignee filter", () => {
  assert(/unassigned/i.test(param(listTasks, "assignee").hint!));
});
