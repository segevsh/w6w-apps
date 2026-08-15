import { assertEquals } from "@std/assert";
import companyUpdate from "../../actions/company-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-update: PUTs the settings that were provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "COM1", name: "Widget Shop" } }]);
  await companyUpdate.execute(
    {
      accountId: "ACC1",
      companyId: "COM1",
      callscribeEnabled: true,
      swapPpcOverride: true,
      swapLandingOverride: "utm_source",
    },
    ctx,
  );
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/companies/COM1.json");
  assertEquals(JSON.parse(calls[0].body!), {
    callscribe_enabled: true,
    swap_ppc_override: true,
    swap_landing_override: "utm_source",
  });
});

Deno.test("company-update: never exposes the documented no-op deprecated fields as params", () => {
  const keys = companyUpdate.params?.map((p) => p.key) ?? [];
  assertEquals(keys.includes("swapExcludeJquery"), false);
  assertEquals(keys.includes("keywordSpottingEnabled"), false);
});
