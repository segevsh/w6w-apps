import { assertEquals } from "@std/assert";
import dealCreate from "../../actions/deal-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("deal-create: POST /v1/deals/", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 5, name: "Renewal" } }]);
  const result = await dealCreate.execute({
    name: "Renewal",
    amount: "11.33",
    pipelineDesc: "Sales",
    expectedClosedDate: "2026-11-30",
    customFields: [{ field: "a", value: "b" }],
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/deals/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body as string), {
    name: "Renewal",
    amount: "11.33",
    pipeline_desc: "Sales",
    expected_closed_date: "2026-11-30",
    custom_fields: [{ field: "a", value: "b" }],
  });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(result, { id: 5, name: "Renewal" });
});

Deno.test("deal-create: declares type perform", () => {
  assertEquals(dealCreate.type, "perform");
  assertEquals(dealCreate.idempotent, false);
});

Deno.test("deal-create: surfaces the vendor error body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { detail: "Not found." } }]);
  let message = "";
  try {
    await dealCreate.execute({
      name: "Renewal",
      amount: "11.33",
      pipelineDesc: "Sales",
      expectedClosedDate: "2026-11-30",
      customFields: [{ field: "a", value: "b" }],
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Not found."), true);
  assertEquals(message.includes("400"), true);
});
