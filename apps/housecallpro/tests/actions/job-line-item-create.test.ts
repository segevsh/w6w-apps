import { assertEquals } from "@std/assert";
import jobLineItemCreate from "../../actions/job-line-item-create.ts";
import { bodyOf, mockCtx, optionValues, pathOf } from "../_helpers.ts";

Deno.test("job-line-item-create: POSTs to the job's line items collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "li1", amount: 9900 } }]);
  await jobLineItemCreate.execute({
    jobId: "j1",
    name: "Diagnostic",
    unitPrice: 9900,
    quantity: 1,
    kind: "labor",
    taxable: false,
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/jobs/j1/line_items");
  assertEquals(bodyOf(calls[0]), {
    name: "Diagnostic",
    unit_price: 9900,
    quantity: 1,
    kind: "labor",
    taxable: false,
  });
});

Deno.test("job-line-item-create: the kind enum excludes tax, removed 2025-10-20", () => {
  const values = optionValues(jobLineItemCreate.params?.find((p) => p.key === "kind"));
  assertEquals(values, [
    "materials",
    "labor",
    "fixed gratuity",
    "fixed discount",
    "percent discount",
  ]);
  assertEquals(values.includes("tax"), false);
});

Deno.test("job-line-item-create: warns in its description that this endpoint is rate limited", () => {
  assertEquals(jobLineItemCreate.description?.includes("rate-limits"), true);
});
