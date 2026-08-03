import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-account-summary.ts";

Deno.test("get-account-summary: GETs /v3/account/summary", async () => {
  const { ctx, calls } = mockCtx([{
    body: { organization_name: "Acme Co", contact_email: "ops@acme.test" },
  }]);
  const out = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/account/summary");
  assertEquals(out.organization_name, "Acme Co");
});

Deno.test("get-account-summary: omits extra_fields by default", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({}, ctx);
  assert(!new URL(calls[0].url).searchParams.has("extra_fields"));
});

Deno.test("get-account-summary: forwards a comma-separated extra_fields list", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ extraFields: "physical_address,company_logo" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("extra_fields"),
    "physical_address,company_logo",
  );
});
