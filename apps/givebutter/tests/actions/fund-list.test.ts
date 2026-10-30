import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import fundList from "../../actions/fund-list.ts";
import { mockCtx, pageEnvelope, pathOf } from "../_helpers.ts";

test("fund-list: hits /funds", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([{ id: "1", name: "General" }]) }]);
  const out = await fundList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/funds");
  assertEquals((out as { data: unknown[] }).data.length, 1);
});
