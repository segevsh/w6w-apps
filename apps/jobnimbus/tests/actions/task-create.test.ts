import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import taskCreate from "../../actions/task-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("task-create: POSTs the given fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { jnid: "t1" } }]);
  await taskCreate.execute({
    title: "Meet with Bob to discuss proposal",
    date_start: 1460131200,
    record_type_name: "Appointment",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api1/tasks");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Meet with Bob to discuss proposal",
    date_start: 1460131200,
    record_type_name: "Appointment",
  });
});

test("task-create: related_jnid becomes the related: [{id}] array JobNimbus expects", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await taskCreate.execute({ title: "Follow up", related_jnid: "imqpqhqpaz5l5l92" }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.related, [{ id: "imqpqhqpaz5l5l92" }]);
  assertEquals("related_jnid" in body, false);
});

test("task-create: is not marked idempotent", () => {
  assertEquals(taskCreate.idempotent, false);
});
