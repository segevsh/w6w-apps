import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import carrierList from "../../actions/carrier-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("carrier-list: GET /carriers, wraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 91, name: "Progressive" }] }]);
  const result = await carrierList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/carriers");
  assertEquals(result, { carriers: [{ id: 91, name: "Progressive" }] });
});
