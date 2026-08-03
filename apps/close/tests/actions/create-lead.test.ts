import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-lead.ts";

Deno.test("create-lead: is a non-idempotent perform", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});

Deno.test("create-lead: POSTs /lead/ with the mapped snake_case body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "lead_1" } }]);
  await action.execute({ name: "Bluth Company", url: "http://x.com", statusId: "stat_1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/lead/");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Bluth Company",
    url: "http://x.com",
    status_id: "stat_1",
  });
});

Deno.test("create-lead: omits every field the caller did not supply", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ name: "Only" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Only" });
});

Deno.test("create-lead: nests contacts and addresses as Close accepts them", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  const contacts = [{ name: "Gob", emails: [{ email: "gob@example.com", type: "office" }] }];
  const addresses = [{ address_1: "747 Howard St", city: "San Francisco" }];
  await action.execute({ name: "Bluth", contacts, addresses }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.contacts, contacts);
  assertEquals(sent.addresses, addresses);
});

Deno.test("create-lead: flattens custom fields to top-level `custom.<id>` keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await action.execute({ name: "Bluth", customFields: { cf_abc: "Segway" } }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent["custom.cf_abc"], "Segway");
  // The nested `custom` dict form is deprecated by Close and must not be used.
  assertEquals(sent.custom, undefined);
});

Deno.test("create-lead: exposes statusId but not the mutually exclusive `status`", () => {
  const keys = (action.params ?? []).map((p) => p.key);
  assert(keys.includes("statusId"));
  // Close forbids sending both; offering only the id makes that unrepresentable.
  assertEquals(keys.includes("status"), false);
});
