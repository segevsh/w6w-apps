import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import personGet from "../../actions/person-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("person-get: GET /persons/:id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 8, firstname: "Jane" } }]);
  const out = await personGet.execute({ id: 8 }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/persons/8");
  assertEquals(out, { id: 8, firstname: "Jane" });
});
