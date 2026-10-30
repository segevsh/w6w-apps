import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import fundGet from "../../actions/fund-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("fund-get: fetches /funds/{id} by whatever id string was given", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "fund_abc", name: "General" }) }]);
  const out = await fundGet.execute({ id: "fund_abc" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/funds/fund_abc");
  assertEquals(out, { id: "fund_abc", name: "General" });
});
