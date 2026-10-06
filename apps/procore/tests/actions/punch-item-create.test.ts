import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/punch-item-create.ts";

Deno.test("punch-item-create: POSTs project_id beside punch_item, assignees as login_information_ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 12, name: "Touch up" } }]);
  const out = await action.execute!({
    companyId: 5,
    projectId: 8,
    name: "Touch up",
    description: "Lobby wall",
    priority: "low",
    due: "2026-11-01",
    locationId: 9,
    assigneeIds: [4, 6],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1.0/punch_items");
  assertEquals(calls[0].headers["procore-company-id"], "5");
  assertEquals(JSON.parse(calls[0].body!), {
    project_id: 8,
    punch_item: {
      name: "Touch up",
      description: "Lobby wall",
      priority: "low",
      due: "2026-11-01",
      location_id: 9,
      login_information_ids: [4, 6],
    },
  });
  assertEquals(out, { id: 12, name: "Touch up" });
});

Deno.test("punch-item-create: minimal body is just the name", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ projectId: 8, name: "N" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { project_id: 8, punch_item: { name: "N" } });
});

Deno.test("punch-item-create: is declared non-idempotent", () => {
  assertEquals(action.idempotent, false);
});
