import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/observation-create.ts";

Deno.test("observation-create: POSTs project_id beside the observation object", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 11, name: "Open edge" } }]);
  const out = await action.execute!({
    companyId: 5,
    projectId: 8,
    name: "Open edge",
    typeId: 2,
    description: "Level 3",
    priority: "High",
    status: "initiated",
    dueDate: "2026-11-01",
    assigneeIds: [4],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1.0/observations/items");
  assertEquals(calls[0].headers["procore-company-id"], "5");
  assertEquals(JSON.parse(calls[0].body!), {
    project_id: 8,
    observation: {
      name: "Open edge",
      type_id: 2,
      description: "Level 3",
      priority: "High",
      status: "initiated",
      due_date: "2026-11-01",
      assignee_ids: [4],
    },
  });
  assertEquals(out, { id: 11, name: "Open edge" });
});

Deno.test("observation-create: minimal body is name and type_id", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ projectId: 8, name: "N", typeId: 2 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    project_id: 8,
    observation: { name: "N", type_id: 2 },
  });
});

Deno.test("observation-create: is declared non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
