import { assertEquals } from "@std/assert";
import recordSchemaGet from "../../actions/record-schema-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("record-schema-get: GET /records/metadata", async () => {
  const { ctx, calls } = mockCtx([{
    body: { recordTypes: { contract: { displayName: "Contract" } }, properties: {} },
  }]);
  const out = await recordSchemaGet.execute({}, ctx) as { recordTypes: Record<string, unknown> };
  assertEquals(pathOf(calls[0].url), "/public/api/v1/records/metadata");
  assertEquals(Object.keys(out.recordTypes), ["contract"]);
});
