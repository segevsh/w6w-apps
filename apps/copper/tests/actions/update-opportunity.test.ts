import { assertEquals } from "@std/assert";
import { mockCtx, optionValues } from "../_helpers.ts";
import action from "../../actions/update-opportunity.ts";

Deno.test("update-opportunity: PUTs to /opportunities/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 4417020 } }]);
  await action.execute({ opportunityId: 4417020, pipelineStageId: 987791 }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/opportunities/4417020");
  assertEquals(JSON.parse(calls[0].body!), { pipeline_stage_id: 987791 });
});

Deno.test("update-opportunity: closes a deal Lost with a reason in one body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ opportunityId: 1, status: "Lost", lossReasonId: 5 }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { status: "Lost", loss_reason_id: 5 });
});

Deno.test("update-opportunity: forwards an explicit null to clear a field", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ opportunityId: 1, monetaryValue: null, details: null }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { monetary_value: null, details: null });
});

Deno.test("update-opportunity: is an idempotent perform with Copper's status vocabulary", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assertEquals(optionValues(action, "status"), ["Open", "Won", "Lost", "Abandoned"]);
});
