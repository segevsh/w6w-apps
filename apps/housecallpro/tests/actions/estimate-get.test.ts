import { assertEquals } from "@std/assert";
import estimateGet from "../../actions/estimate-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("estimate-get: calls GET /estimates/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "e1", options: [{ id: "o1" }] } }]);
  const out = await estimateGet.execute({ estimateId: "e1" }, ctx) as { options: unknown[] };

  assertEquals(pathOf(calls[0].url), "/estimates/e1");
  assertEquals(out.options.length, 1);
});

Deno.test("estimate-get: records the asymmetry with the estimate list", () => {
  assertEquals(estimateGet.description?.includes("integration-partner"), true);
  assertEquals(estimateGet.description?.includes("Find Estimates does accept one"), true);
});
