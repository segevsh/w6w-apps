import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import jobMaterialCreate from "../../actions/jobmaterial-create.ts";
import { bodyOf, mockCtx, pathOf, result } from "../_helpers.ts";

test("jobmaterial-create: POSTs to /jobmaterial.json", async () => {
  const { ctx, calls } = mockCtx([{ body: result(), headers: { "x-record-uuid": "m1" } }]);
  const out = await jobMaterialCreate.execute({
    jobUuid: "j1",
    name: "Copper pipe",
    quantity: "2",
    price: "45.00",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/api_1.0/jobmaterial.json");
  assertEquals(bodyOf(calls[0]), {
    job_uuid: "j1",
    name: "Copper pipe",
    quantity: "2",
    price: "45.00",
  });
  assertEquals(out, { uuid: "m1" });
});

test("jobmaterial-create: quantity is required, matching JobMaterialCreate's schema", () => {
  const quantity = jobMaterialCreate.params?.find((p) => p.key === "quantity");
  assertEquals(quantity?.required, true);
});
