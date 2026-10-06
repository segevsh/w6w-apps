import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/company-settings-get.ts";
import { mockCtx, pathOf, problemBody, queryOf } from "../_helpers.ts";

Deno.test("company-settings-get: sends GET /company-settings and returns the vendor body", async () => {
  const { ctx, calls } = mockCtx([{ body: { companyId: "co1", name: "Acme Roofing" } }]);
  const out = await action.execute({} as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/company-settings");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out, { companyId: "co1", name: "Acme Roofing" });
});

Deno.test("company-settings-get: a vendor error surfaces its title and status", async () => {
  const { ctx } = mockCtx([{ status: 404, body: problemBody(404, "Resource not found.") }]);
  await assertRejects(
    async () => await action.execute({} as never, ctx),
    Error,
    "AccuLynx 404",
  );
});
