import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import csrList from "../../actions/csr-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("csr-list: GET /csrs, unwraps the {csrs: [...]} envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { csrs: [{ id: 1, name: "Pat" }] } }]);
  const result = await csrList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/csrs");
  assertEquals(result, { csrs: [{ id: 1, name: "Pat" }] });
});

/**
 * The endpoint this app's other lookups (carriers, employees, lead sources)
 * share does NOT wrap in an envelope — this pins that /csrs is the exception,
 * not accidentally copied.
 */
test("csr-list: a missing csrs key normalizes to an empty array, not undefined", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const result = await csrList.execute({}, ctx);
  assertEquals(result, { csrs: [] });
});
