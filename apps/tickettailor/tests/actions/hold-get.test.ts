import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import holdGet from "../../actions/hold-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("hold-get: hits GET /holds/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "ho_1", note: "Press hold" } }]);
  const result = await holdGet.execute({ holdId: "ho_1" }, ctx) as { note: string };
  assertEquals(pathOf(calls[0].url), "/v1/holds/ho_1");
  assertEquals(result.note, "Press hold");
});
