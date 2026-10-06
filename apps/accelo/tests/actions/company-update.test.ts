import { assertEquals, assertRejects } from "@std/assert";
import { mockAcceloCtx } from "../_helpers.ts";
import action from "../../actions/company-update.ts";

Deno.test("company-update: PUTs only the changed fields to /companies/{id}", async () => {
  const { ctx, calls } = mockAcceloCtx([{
    body: { meta: { status: "ok" }, response: { id: "8" } },
  }]);
  const out = await action.execute({ companyId: 8, ...{ "name": "New", "phone": "555" } }, ctx);
  assertEquals(out, { id: "8" });
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url, "https://acme.api.accelo.com/api/v0/companies/8");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(Object.fromEntries(new URLSearchParams(calls[0].body ?? "")), {
    "name": "New",
    "phone": "555",
  });
});

Deno.test("company-update: refuses an update that sets nothing, without a request", async () => {
  const { ctx, calls } = mockAcceloCtx([]);
  await assertRejects(
    async () => await action.execute({ companyId: 8 }, ctx),
    Error,
    "at least one field",
  );
  assertEquals(calls.length, 0);
});
