import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import leadSourceList from "../../actions/lead-source-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("lead-source-list: GET /lead-sources, wraps the bare array", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, name: "Referral" }] }]);
  const result = await leadSourceList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/api/lead-sources");
  assertEquals(result, { leadSources: [{ id: 1, name: "Referral" }] });
});
