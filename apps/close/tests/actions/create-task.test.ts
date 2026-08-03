import { assert, assertEquals } from "@std/assert";
import { description, mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/create-task.ts";

Deno.test("create-task: POSTs /task/ defaulting _type to lead", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "task_1" } }]);
  await action.execute({ leadId: "lead_1", text: "Call them back" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/task/");
  assertEquals(JSON.parse(calls[0].body!), {
    _type: "lead",
    lead_id: "lead_1",
    text: "Call them back",
  });
});

Deno.test("create-task: honours an explicit outgoing_call type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ leadId: "lead_1", text: "x", type: "outgoing_call" }, ctx);
  assertEquals(JSON.parse(calls[0].body!)._type, "outgoing_call");
});

Deno.test("create-task: offers ONLY the two types Close can actually create", () => {
  assertEquals(optionValues(action, "type"), ["lead", "outgoing_call"]);
});

Deno.test("create-task: sends `date`, not the deprecated `due_date`", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ leadId: "lead_1", text: "x", date: "2026-01-05" }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.date, "2026-01-05");
  assertEquals(sent.due_date, undefined);
});

Deno.test("create-task: carries assignment, dateless and completion flags", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({
    leadId: "lead_1",
    text: "x",
    assignedTo: "user_1",
    isDateless: true,
    isComplete: false,
    priority: "high",
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.assigned_to, "user_1");
  assertEquals(sent.is_dateless, true);
  assertEquals(sent.is_complete, false);
  assertEquals(sent.priority, "high");
});

Deno.test("create-task: requires lead id and text, and is not idempotent", () => {
  assertEquals(action.params?.find((p) => p.key === "leadId")?.required, true);
  assertEquals(action.params?.find((p) => p.key === "text")?.required, true);
  assertEquals(action.idempotent, false);
  assert(/only .*lead.* and .*outgoing_call/i.test(description(action)));
});
