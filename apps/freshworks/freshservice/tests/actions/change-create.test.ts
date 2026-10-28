import { assertEquals } from "@std/assert";
import { mockFreshserviceCtx } from "../_helpers.ts";
import action from "../../actions/change-create.ts";

Deno.test("change-create: POSTs /changes with the mandatory grading fields", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: { change: { id: 2 } } }]);
  const out = await action.execute({
    subject: "Replace ES3",
    description: "<div>Server is failing</div>",
    priority: 1,
    status: 1,
    impact: 1,
    risk: 1,
    changeType: 1,
  }, ctx);
  assertEquals(calls[0].url, "https://acme.freshservice.com/api/v2/changes");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    subject: "Replace ES3",
    description: "<div>Server is failing</div>",
    priority: 1,
    status: 1,
    impact: 1,
    risk: 1,
    change_type: 1,
  });
  assertEquals(out, { id: 2 });
});

Deno.test("change-create: maps the planning window and routing fields", async () => {
  const { ctx, calls } = mockFreshserviceCtx([{ body: {} }]);
  await action.execute({
    subject: "s",
    description: "d",
    priority: 2,
    status: 2,
    impact: 2,
    risk: 2,
    changeType: 2,
    plannedStartDate: "2026-03-20T16:18:46Z",
    plannedEndDate: "2026-03-23T16:18:46Z",
    agentId: 1,
    groupId: 2,
    departmentId: 3,
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.planned_start_date, "2026-03-20T16:18:46Z");
  assertEquals(body.planned_end_date, "2026-03-23T16:18:46Z");
  assertEquals(body.agent_id, 1);
  assertEquals(body.group_id, 2);
  assertEquals(body.department_id, 3);
});

Deno.test("change-create: declares the five fields Freshservice marks mandatory", () => {
  const required = (action.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required.sort(), [
    "changeType",
    "description",
    "impact",
    "priority",
    "risk",
    "status",
    "subject",
  ]);
});
