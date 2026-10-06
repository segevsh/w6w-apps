import { assertEquals } from "@std/assert";
import partList from "../../actions/part-list.ts";
import { mockCtx, pathOf, queryAll } from "../_helpers.ts";

Deno.test("part-list: GET /v1/parts with partNumber as repeated keys", async () => {
  const { ctx, calls } = mockCtx([{
    body: { parts: [{ id: 1, name: "Belt" }], nextCursor: null },
  }]);
  const out = await partList.execute({
    partNumber: "A1,B2",
    createdAfter: "2026-01-01T00:00:00.000Z",
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/parts");
  assertEquals(queryAll(calls[0].url), {
    partNumber: ["A1", "B2"],
    "createdAt[gte]": ["2026-01-01T00:00:00.000Z"],
  });
  assertEquals(out, { parts: [{ id: 1, name: "Belt" }], nextCursor: null });
});
