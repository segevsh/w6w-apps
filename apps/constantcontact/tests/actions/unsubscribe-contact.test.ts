import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/unsubscribe-contact.ts";

const existing = {
  contact_id: "c1",
  email_address: { address: "a@b.test", permission_to_send: "explicit" },
  first_name: "Ada",
  last_name: "Lovelace",
  job_title: "Analyst",
  company_name: "Acme",
  birthday_month: 12,
  birthday_day: 10,
  anniversary: "2020-12-10",
};

Deno.test("unsubscribe-contact: reads the contact, then PUTs it back", async () => {
  const { ctx, calls } = mockCtx([
    { body: existing },
    { body: { ...existing, email_address: { address: "a@b.test" } } },
  ]);
  await action.execute!({ contactId: "c1" }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v3/contacts/c1");
  assertEquals(calls[1].method, "PUT");
  assertEquals(new URL(calls[1].url).pathname, "/v3/contacts/c1");
});

Deno.test("unsubscribe-contact: sets permission_to_send to unsubscribed", async () => {
  const { ctx, calls } = mockCtx([{ body: existing }, { body: {} }]);
  await action.execute!({ contactId: "c1" }, ctx);
  const body = JSON.parse(calls[1].body!);
  assertEquals(body.email_address.address, "a@b.test");
  assertEquals(body.email_address.permission_to_send, "unsubscribed");
});

Deno.test("unsubscribe-contact: echoes the scalars back so the full-replace PUT does not null them", async () => {
  const { ctx, calls } = mockCtx([{ body: existing }, { body: {} }]);
  await action.execute!({ contactId: "c1" }, ctx);
  const body = JSON.parse(calls[1].body!);
  assertEquals(body.first_name, "Ada");
  assertEquals(body.last_name, "Lovelace");
  assertEquals(body.job_title, "Analyst");
  assertEquals(body.company_name, "Acme");
  assertEquals(body.birthday_month, 12);
  assertEquals(body.birthday_day, 10);
  assertEquals(body.anniversary, "2020-12-10");
});

Deno.test("unsubscribe-contact: does not echo sub-resources, which survive by omission", async () => {
  const { ctx, calls } = mockCtx([
    { body: { ...existing, list_memberships: ["l1"], taggings: ["t1"] } },
    { body: {} },
  ]);
  await action.execute!({ contactId: "c1" }, ctx);
  const body = JSON.parse(calls[1].body!);
  assertEquals("list_memberships" in body, false);
  assertEquals("taggings" in body, false);
});

Deno.test("unsubscribe-contact: does not fetch sub-resources it will not echo", async () => {
  const { ctx, calls } = mockCtx([{ body: existing }, { body: {} }]);
  await action.execute!({ contactId: "c1" }, ctx);
  assert(!new URL(calls[0].url).searchParams.has("include"));
});

Deno.test("unsubscribe-contact: defaults update_source to Contact", async () => {
  const { ctx, calls } = mockCtx([{ body: existing }, { body: {} }]);
  await action.execute!({ contactId: "c1" }, ctx);
  assertEquals(JSON.parse(calls[1].body!).update_source, "Contact");
});

Deno.test("unsubscribe-contact: honours an Account update_source", async () => {
  const { ctx, calls } = mockCtx([{ body: existing }, { body: {} }]);
  await action.execute!({ contactId: "c1", updateSource: "Account" }, ctx);
  assertEquals(JSON.parse(calls[1].body!).update_source, "Account");
});

Deno.test("unsubscribe-contact: carries the opt-out reason when given", async () => {
  const { ctx, calls } = mockCtx([{ body: existing }, { body: {} }]);
  await action.execute!({ contactId: "c1", optOutReason: "No longer interested" }, ctx);
  assertEquals(JSON.parse(calls[1].body!).email_address.opt_out_reason, "No longer interested");
});

Deno.test("unsubscribe-contact: omits opt_out_reason when not given", async () => {
  const { ctx, calls } = mockCtx([{ body: existing }, { body: {} }]);
  await action.execute!({ contactId: "c1" }, ctx);
  assertEquals("opt_out_reason" in JSON.parse(calls[1].body!).email_address, false);
});

Deno.test("unsubscribe-contact: omits scalars the contact does not have", async () => {
  const { ctx, calls } = mockCtx([
    { body: { contact_id: "c1", email_address: { address: "a@b.test" } } },
    { body: {} },
  ]);
  await action.execute!({ contactId: "c1" }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[1].body!)).sort(), [
    "email_address",
    "update_source",
  ]);
});

Deno.test("unsubscribe-contact: refuses an SMS-only contact rather than PUTting a null address", async () => {
  const { ctx, calls } = mockCtx([{ body: { contact_id: "c1" } }]);
  await assertRejects(
    () => action.execute!({ contactId: "c1" }, ctx) as Promise<unknown>,
    Error,
    "no email address",
  );
  assertEquals(calls.length, 1, "must not attempt the PUT");
});

Deno.test("unsubscribe-contact: is declared idempotent", () => {
  assertEquals(action.idempotent, true);
});
