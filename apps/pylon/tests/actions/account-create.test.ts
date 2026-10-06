import { assert, assertEquals } from "@std/assert";
import action from "../../actions/account-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("account-create: POSTs snake_case fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "a1", name: "Acme" } } }]);
  const out = await action.execute!({
    name: "Acme",
    accountType: "partner",
    domains: "acme.com, acme.io",
    primaryDomain: "acme.com",
    externalIds: '[{"external_id":"c-1","label":"crm"}]',
    ownerId: "u1",
    tags: ["vip"],
    customFields: [{ slug: "tier", value: "gold" }],
  }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/accounts");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Acme",
    account_type: "partner",
    domains: ["acme.com", "acme.io"],
    primary_domain: "acme.com",
    external_ids: [{ external_id: "c-1", label: "crm" }],
    owner_id: "u1",
    tags: ["vip"],
    custom_fields: [{ slug: "tier", value: "gold" }],
  });
  assertEquals(out, { id: "a1", name: "Acme" });
});

Deno.test("account-create: name only; the deprecated `domain` field is not exposed", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ name: "Solo" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Solo" });
  assert(!action.params!.some((p) => p.key === "domain"));
  assertEquals(action.idempotent, false);
});
