import { assertEquals } from "@std/assert";
import taskCreate from "../../actions/task-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("task-create: POST /v1/tasks/", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 8, name: "Call Ada" } }]);
  const result = await taskCreate.execute({
    name: "Call Ada",
    dueDate: "2026-11-28T13:00:00+02:00",
    relatedContacts: '["https://api.clientify.net/v1/contacts/42/"]',
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/tasks/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body as string), {
    name: "Call Ada",
    due_date: "2026-11-28T13:00:00+02:00",
    related_contacts: ["https://api.clientify.net/v1/contacts/42/"],
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, { id: 8, name: "Call Ada" });
});

Deno.test("task-create: declares type perform", () => {
  assertEquals(taskCreate.type, "perform");
  assertEquals(taskCreate.idempotent, false);
});

Deno.test("task-create: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await taskCreate.execute({
      name: "Call Ada",
      dueDate: "2026-11-28T13:00:00+02:00",
      relatedContacts: '["https://api.clientify.net/v1/contacts/42/"]',
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
