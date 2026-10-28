import { assertEquals } from "@std/assert";
import adAccountGet from "../../actions/ad-account-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ad-account-get: fetches by bare id", async () => {
  const body = { id: 512352200, name: "Company A", status: "ACTIVE" };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await adAccountGet.execute({ accountId: "512352200" }, ctx);

  assertEquals(pathOf(calls[0].url), "/rest/adAccounts/512352200");
  assertEquals(result, body);
});

Deno.test("ad-account-get: also accepts the full URN and strips it to a bare id", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await adAccountGet.execute({ accountId: "urn:li:sponsoredAccount:512352200" }, ctx);
  assertEquals(pathOf(calls[0].url), "/rest/adAccounts/512352200");
});
