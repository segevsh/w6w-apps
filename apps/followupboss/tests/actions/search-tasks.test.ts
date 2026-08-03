import { assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import searchTasks from "../../actions/search-tasks.ts";

Deno.test("search-tasks: GETs /tasks with named due ranges and joined types", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { _metadata: { collection: "tasks" }, tasks: [] },
  }]);
  await searchTasks.execute({
    due: "overdue",
    isCompleted: false,
    type: ["Call", "Showing"] as unknown as string,
    assignedUserId: 1,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/tasks");
  assertEquals(url.searchParams.get("due"), "overdue");
  assertEquals(url.searchParams.get("isCompleted"), "false");
  assertEquals(url.searchParams.get("type"), "Call,Showing");
  assertEquals(url.searchParams.get("assignedUserId"), "1");
});

Deno.test("search-tasks: offers the three documented due ranges", () => {
  assertEquals(optionValues(searchTasks, "due"), ["today", "overdue", "upcoming"]);
});
