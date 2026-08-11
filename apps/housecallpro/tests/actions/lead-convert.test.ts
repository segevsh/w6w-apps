import { assertEquals } from "@std/assert";
import leadConvert from "../../actions/lead-convert.ts";
import { bodyOf, mockCtx, optionValues, pathOf } from "../_helpers.ts";

Deno.test("lead-convert: POSTs the target type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { job_id: "j1" } }]);
  const out = await leadConvert.execute({ leadId: "l1", type: "job" }, ctx) as { job_id: string };

  assertEquals(pathOf(calls[0].url), "/leads/l1/convert");
  assertEquals(bodyOf(calls[0]), { type: "job" });
  assertEquals(out.job_id, "j1");
});

Deno.test("lead-convert: offers only the two documented target types", () => {
  const values = optionValues(leadConvert.params?.find((p) => p.key === "type"));
  assertEquals(values.slice().sort(), ["estimate", "job"]);
});

Deno.test("lead-convert: is not idempotent — each call creates a new record", () => {
  assertEquals(leadConvert.idempotent, false);
});
