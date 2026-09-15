import { assertEquals } from "@std/assert";
import cropResultGet from "../../actions/crop-result-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("crop-result-get: fetches the crop results route by id", async () => {
  const { ctx, calls } = mockCtx([
    { body: { inference: { result: { crops: [{ object_type: "photo" }] } } } },
  ]);
  const result = await cropResultGet.execute({ inferenceId: "abc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/products/crop/results/abc");
  assertEquals(
    (result as { inference: { result: { crops: Array<{ object_type: string }> } } }).inference
      .result.crops[0]
      .object_type,
    "photo",
  );
});
