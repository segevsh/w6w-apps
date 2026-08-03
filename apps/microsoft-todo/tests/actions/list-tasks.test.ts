import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-tasks.ts";

Deno.test("list-tasks: hits the list's tasks collection with no invented params", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute!({ taskList: "L1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1.0/me/todo/lists/L1/tasks");
  assertEquals([...url.searchParams.keys()], []);
});

Deno.test("list-tasks: forwards every OData param under its `$` name", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute!({
    taskList: "L1",
    filter: "status ne 'completed'",
    orderBy: "dueDateTime/dateTime asc",
    select: ["id", "title"],
    expand: ["checklistItems", "linkedResources"],
    top: 50,
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("$filter"), "status ne 'completed'");
  assertEquals(p.get("$orderby"), "dueDateTime/dateTime asc");
  assertEquals(p.get("$select"), "id,title");
  assertEquals(p.get("$expand"), "checklistItems,linkedResources");
  assertEquals(p.get("$top"), "50");
});

Deno.test("list-tasks: a nextLink wins over the freshly built query", async () => {
  const link = "https://graph.microsoft.com/v1.0/me/todo/lists/L1/tasks?$skiptoken=z";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute!({ taskList: "L1", nextLink: link, filter: "ignored" }, ctx);
  assertEquals(calls[0].url, link);
});

Deno.test("list-tasks: is a search over the task resource", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "task");
  // There is no cross-list endpoint, so the list id is not optional.
  assert(action.params!.find((p) => p.key === "taskList")?.required);
});
