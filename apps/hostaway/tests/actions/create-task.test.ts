import { assertEquals, assertRejects } from "@std/assert";
import { envelope, mockCtx } from "../_helpers.ts";
import action from "../../actions/create-task.ts";

Deno.test("create-task: POSTs the task object, with title the documented required field", async () => {
  const { ctx, calls } = mockCtx([envelope({ id: 1, title: "Task title" })]);
  await action.execute(
    {
      title: "Task title",
      listingMapId: 40160,
      assigneeUserId: 7,
      canStartFrom: "2023-07-01 00:00:00",
      shouldEndBy: "2023-07-30 00:00:00",
      status: "pending",
      priority: 1,
      cost: 20,
      costCurrency: "USD",
      color: "#000000",
    },
    ctx,
  );

  assertEquals(calls[0].url, "https://api.hostaway.com/v1/tasks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Task title",
    listingMapId: 40160,
    assigneeUserId: 7,
    canStartFrom: "2023-07-01 00:00:00",
    shouldEndBy: "2023-07-30 00:00:00",
    status: "pending",
    priority: 1,
    cost: 20,
    costCurrency: "USD",
    color: "#000000",
  });
});

Deno.test("create-task: refuses a task with no title, making no request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(() => Promise.resolve(action.execute({}, ctx)), Error, "`title` is required");
  await assertRejects(
    () => Promise.resolve(action.execute({ title: "   " }, ctx)),
    Error,
    "`title` is required",
  );
  assertEquals(calls.length, 0);
});
