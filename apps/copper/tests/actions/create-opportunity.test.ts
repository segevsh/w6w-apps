import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import action from "../../actions/create-opportunity.ts";

Deno.test("create-opportunity: POSTs to /opportunities with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 4417020 } }]);
  await action.execute({
    name: "New Demo Opportunity",
    primaryContactId: 27140359,
    customerSourceId: 331242,
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/opportunities");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "New Demo Opportunity",
    primary_contact_id: 27140359,
    customer_source_id: 331242,
  });
});

Deno.test("create-opportunity: sends the whole field set in snake_case", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({
    name: "Deal",
    companyId: 2,
    pipelineId: 213214,
    pipelineStageId: 987790,
    lossReasonId: 5,
    assigneeId: 137658,
    monetaryValue: 5000,
    closeDate: "12/31/2026",
    priority: "High",
    status: "Open",
    winProbability: 40,
    details: "notes",
    tags: ["q4"],
    customFields: [{ custom_field_definition_id: 1, value: 2 }],
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Deal",
    company_id: 2,
    pipeline_id: 213214,
    pipeline_stage_id: 987790,
    loss_reason_id: 5,
    assignee_id: 137658,
    monetary_value: 5000,
    close_date: "12/31/2026",
    priority: "High",
    status: "Open",
    win_probability: 40,
    details: "notes",
    tags: ["q4"],
    custom_fields: [{ custom_field_definition_id: 1, value: 2 }],
  });
});

Deno.test("create-opportunity: closeDate is TEXT, not a timestamp — Copper's documented exception", () => {
  const p = param(action, "closeDate");
  assertEquals(p.type, "string");
  assert(/MM\/DD\/YYYY/.test(p.hint ?? ""), "hint does not state the date format");
  assert(/NOT a Unix timestamp|not a Unix timestamp/i.test(p.hint ?? ""));
});

Deno.test("create-opportunity: status and priority use Copper's exact vocabularies", () => {
  assertEquals(optionValues(action, "status"), ["Open", "Won", "Lost", "Abandoned"]);
  assertEquals(optionValues(action, "priority"), ["None", "Low", "Medium", "High"]);
});

Deno.test("create-opportunity: win probability is bounded 0-100", () => {
  assertEquals(param(action, "winProbability").validation?.min, 0);
  assertEquals(param(action, "winProbability").validation?.max, 100);
});

Deno.test("create-opportunity: only `name` is required, per Copper's create page", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals((action.params ?? []).filter((p) => p.required).map((p) => p.key), ["name"]);
});
