import { assertEquals, assertRejects } from "@std/assert";
import tasksCreate from "../../actions/tasks-create.ts";
import { mockCtx } from "../_helpers.ts";

const TASKS = [
  { type: "search", input: { q: "q", depth: "fast", outputType: "searchResults" } },
  { type: "fetch", input: { url: "https://e.com" } },
];

Deno.test("tasks-create: rejects bad batches before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await tasksCreate.execute({ tasks: [] }, ctx), Error, "1 to 100");
  await assertRejects(
    async () => await tasksCreate.execute({ tasks: Array(101).fill(TASKS[1]) }, ctx),
    Error,
    "1 to 100",
  );
  await assertRejects(
    async () => await tasksCreate.execute({ tasks: [{ type: "crawl", input: {} }] }, ctx),
    Error,
    "Task 1: type",
  );
  await assertRejects(
    async () => await tasksCreate.execute({ tasks: [TASKS[0], { type: "fetch" }] }, ctx),
    Error,
    "Task 2: input",
  );
  assertEquals(calls.length, 0);
});
