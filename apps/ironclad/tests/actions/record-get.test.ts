import { assertEquals } from "@std/assert";
import recordGet from "../../actions/record-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("record-get: GET /records/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "r1", name: "MSA", properties: {} } }]);
  const out = await recordGet.execute({ recordId: "r1", addressAsObject: true }, ctx) as {
    name: string;
  };
  assertEquals(pathOf(calls[0].url), "/public/api/v1/records/r1");
  assertEquals(queryOf(calls[0].url), { addressAsObject: "true" });
  assertEquals(out.name, "MSA");
});
