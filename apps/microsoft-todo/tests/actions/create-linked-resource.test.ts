import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-linked-resource.ts";

Deno.test("create-linked-resource: POSTs the back-pointer to the task", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "lr1" } }]);
  await action.execute!({
    taskList: "L1",
    task: "T1",
    applicationName: "Acme CRM",
    displayName: "Deal #42",
    externalId: "42",
    webUrl: "https://crm.example.com/deals/42",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1.0/me/todo/lists/L1/tasks/T1/linkedResources",
  );
  assertEquals(JSON.parse(calls[0].body!), {
    applicationName: "Acme CRM",
    displayName: "Deal #42",
    externalId: "42",
    webUrl: "https://crm.example.com/deals/42",
  });
});

Deno.test("create-linked-resource: webUrl is optional, per Microsoft's own note", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ taskList: "L1", task: "T1", applicationName: "SMS app" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { applicationName: "SMS app" });
  assert(!action.params!.find((p) => p.key === "webUrl")?.required);
  assert(action.params!.find((p) => p.key === "applicationName")?.required);
});
