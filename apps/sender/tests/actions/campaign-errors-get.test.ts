import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import campaignErrorsGet from "../../actions/campaign-errors-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("campaign-errors-get: GETs /v2/campaigns/{id}/errors with no data envelope", async () => {
  const { ctx, calls } = mockCtx([
    { body: { errors: [{ title: "No subscribers selected" }], warnings: [] } },
  ]);
  const out = await campaignErrorsGet.execute({ id: "c1" }, ctx) as { errors: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/campaigns/c1/errors");
  assertEquals(out.errors.length, 1);
});
