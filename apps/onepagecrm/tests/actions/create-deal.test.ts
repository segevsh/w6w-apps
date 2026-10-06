import { assertEquals, assertRejects } from "@std/assert";
import createDeal from "../../actions/create-deal.ts";
import { bodyOf, envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-deal: POST /deals with snake_case body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ deal: { id: "d1" } }) }]);
  const out = await createDeal.execute({
    contactId: "c1",
    name: "Website",
    amount: 0,
    months: 3,
    stage: 10,
    status: "pending",
    expectedCloseDate: "2026-12-01",
    dealFields: '[{"deal_field":{"id":"f1"},"value":"x"}]',
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/deals");
  assertEquals(bodyOf(calls[0]), {
    contact_id: "c1",
    name: "Website",
    amount: 0,
    months: 3,
    stage: 10,
    status: "pending",
    expected_close_date: "2026-12-01",
    deal_fields: [{ deal_field: { id: "f1" }, value: "x" }],
  });
  assertEquals(out.deal, { id: "d1" });
});

Deno.test("create-deal: name and contact are required params; action is not idempotent", () => {
  const required = createDeal.params!.filter((p) => p.required).map((p) => p.key).sort();
  assertEquals(required, ["contactId", "name"]);
  assertEquals(createDeal.idempotent, false);
});

Deno.test("create-deal: a vendor 422/400 is surfaced", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("invalid_request_data", "x") }]);
  await assertRejects(
    () => Promise.resolve(createDeal.execute({ contactId: "c", name: "n" }, ctx)),
    Error,
    "invalid_request_data",
  );
});
