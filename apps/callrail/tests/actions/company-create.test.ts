import { assertEquals } from "@std/assert";
import companyCreate from "../../actions/company-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("company-create: POSTs name and time_zone", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "COM1", name: "Widget Shop" } }]);
  const out = await companyCreate.execute(
    { accountId: "ACC1", name: "Widget Shop", timeZone: "America/New_York" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/a/ACC1/companies.json");
  assertEquals(JSON.parse(calls[0].body!), { name: "Widget Shop", time_zone: "America/New_York" });
  assertEquals(out, { id: "COM1", name: "Widget Shop" });
});

Deno.test("company-create: not idempotent — repeat calls create separate companies", () => {
  assertEquals(companyCreate.idempotent, false);
});
