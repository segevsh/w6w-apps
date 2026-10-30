import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import adAccountGet from "../../actions/ad-account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("ad-account-get: calls GET /ad_accounts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1", name: "Acme Ads", currency: "USD" } }]);
  const out = await adAccountGet.execute({ adAccountId: "1" }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/v5/ad_accounts/1");
  assertEquals(out.name, "Acme Ads");
});
