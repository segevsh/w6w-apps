import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/candidate-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("candidate-create: POSTs a sourced candidate with parsed JSON fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "k1", name: "Bo" } }]);
  const out = await action.execute!({
    companyId: "c1",
    positionId: "p1",
    name: "Bo",
    emailAddress: "bo@x.com",
    tags: "a,b",
    origin: "sourced",
    workHistory: '[{"company_name":"Acme"}]',
    customAttributes: [{ name: "Ref", value: "J" }],
    stageActionsEnabled: false,
  }, ctx);
  assertEquals(
    calls[0].url,
    "https://api.breezy.hr/v3/company/c1/position/p1/candidates?stage_actions_enabled=false",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Bo",
    email_address: "bo@x.com",
    tags: ["a", "b"],
    origin: "sourced",
    work_history: [{ company_name: "Acme" }],
    custom_attributes: [{ name: "Ref", value: "J" }],
  });
  assertEquals(out, { _id: "k1", name: "Bo" });
});

Deno.test("candidate-create: a 202 is reported as accepted, not as a candidate", async () => {
  const { ctx } = mockCtx([{
    status: 202,
    body: { error: { type: "pending", message: "email sent to complete" } },
  }]);
  const out = await action.execute!(
    { companyId: "c1", positionId: "p1", name: "Bo", origin: "applied" },
    ctx,
  );
  assertEquals(out, { accepted: true, message: "email sent to complete" });
});

Deno.test("candidate-create: 409 duplicate is an error", async () => {
  const { ctx } = mockCtx([{ status: 409, body: { error: { type: "exists", message: "dup" } } }]);
  await assertRejects(
    async () => await action.execute!({ companyId: "c1", positionId: "p1", name: "Bo" }, ctx),
    Error,
    "HTTP 409",
  );
  assertEquals(action.idempotent, false);
});
