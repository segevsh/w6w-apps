import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("company-get: GETs the company and returns it", async () => {
  const { ctx, calls } = mockCtx([{ body: { _id: "c1", name: "Acme" } }]);
  const out = await action.execute!({ companyId: "c1" }, ctx);
  assertEquals(calls[0].url, "https://api.breezy.hr/v3/company/c1");
  assertEquals(out, { _id: "c1", name: "Acme" });
});

Deno.test("company-get: a 403 plan error surfaces its type", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { error: { type: "forbidden", message: "Developer API not enabled" } },
  }]);
  await assertRejects(
    async () => await action.execute!({ companyId: "c1" }, ctx),
    Error,
    "HTTP 403 — forbidden: Developer API not enabled",
  );
});
