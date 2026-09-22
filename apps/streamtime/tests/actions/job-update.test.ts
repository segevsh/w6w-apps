import { assertEquals } from "@std/assert";
import jobUpdate from "../../actions/job-update.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("job-update: PUTs the writable fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1010 } }]);
  await jobUpdate.execute({ jobId: 1010, name: "Website Redesign v2", jobLeadUserId: 42 }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v2/jobs/1010");
  assertEquals(bodyOf(calls[0]), { name: "Website Redesign v2", jobLeadUserId: 42 });
});

Deno.test("job-update: the computed financial fields are never sent", () => {
  const keys = (jobUpdate.params ?? []).map((p) => p.key);
  for (
    const readonly of ["isBillable", "exchangeRate", "totalInvoicedExTax", "jobCreatedDatetime"]
  ) {
    assertEquals(keys.includes(readonly), false, readonly);
  }
});
