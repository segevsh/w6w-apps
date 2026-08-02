import { assertEquals } from "@std/assert";
import { mockZohoCtx } from "../_helpers.ts";
import action from "../../actions/task-create.ts";

Deno.test("task-create: POSTs Subject and the optional fields to /Tasks", async () => {
  const { ctx, calls } = mockZohoCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: { id: "1" } }] } },
  ]);
  await action.execute({ subject: "Follow up", dueDate: "2026-09-01", priority: "High" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v6/Tasks");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data[0].Subject, "Follow up");
  assertEquals(body.data[0].Due_Date, "2026-09-01");
  assertEquals(body.data[0].Priority, "High");
});

Deno.test("task-create: sets Who_Id / What_Id + $se_module when related records are given", async () => {
  const { ctx, calls } = mockZohoCtx([
    { body: { data: [{ code: "SUCCESS", status: "success", details: {} }] } },
  ]);
  await action.execute({
    subject: "Call about renewal",
    whoId: "lead-1",
    whatId: "deal-1",
    relatedModule: "Deals",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data[0].Who_Id, { id: "lead-1" });
  assertEquals(body.data[0].What_Id, { id: "deal-1" });
  assertEquals(body.data[0]["$se_module"], "Deals");
});
