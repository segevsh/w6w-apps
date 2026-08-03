import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-contact.ts";

Deno.test("create-contact: POSTs /v3/contacts with the nested email_address object", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { contact_id: "c1" } }]);
  await action.execute!({ emailAddress: "a@b.test" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/contacts");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.email_address, { address: "a@b.test" });
});

Deno.test("create-contact: defaults create_source to Account", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ emailAddress: "a@b.test" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).create_source, "Account");
});

Deno.test("create-contact: honours an explicit create_source of Contact", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ emailAddress: "a@b.test", createSource: "Contact" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).create_source, "Contact");
});

Deno.test("create-contact: nests permission_to_send inside email_address", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ emailAddress: "a@b.test", permissionToSend: "explicit" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.email_address.permission_to_send, "explicit");
  assertEquals(body.permission_to_send, undefined);
});

Deno.test("create-contact: camelCase params become snake_case body keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({
    emailAddress: "a@b.test",
    firstName: "Ada",
    lastName: "Lovelace",
    jobTitle: "Analyst",
    companyName: "Acme",
    birthdayMonth: 12,
    birthdayDay: 10,
    anniversary: "12/10/2020",
    listMemberships: ["l1"],
    taggings: ["t1"],
    customFields: [{ custom_field_id: "f1", value: "gold" }],
    phoneNumbers: [{ phone_number: "555", kind: "mobile" }],
    streetAddresses: [{ kind: "home", city: "London" }],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.first_name, "Ada");
  assertEquals(body.last_name, "Lovelace");
  assertEquals(body.job_title, "Analyst");
  assertEquals(body.company_name, "Acme");
  assertEquals(body.birthday_month, 12);
  assertEquals(body.birthday_day, 10);
  assertEquals(body.anniversary, "12/10/2020");
  assertEquals(body.list_memberships, ["l1"]);
  assertEquals(body.taggings, ["t1"]);
  assertEquals(body.custom_fields, [{ custom_field_id: "f1", value: "gold" }]);
  assertEquals(body.phone_numbers, [{ phone_number: "555", kind: "mobile" }]);
  assertEquals(body.street_addresses, [{ kind: "home", city: "London" }]);
});

Deno.test("create-contact: sends nothing for unsupplied optional fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ emailAddress: "a@b.test" }, ctx);
  assertEquals(Object.keys(JSON.parse(calls[0].body!)).sort(), [
    "create_source",
    "email_address",
  ]);
});

Deno.test("create-contact: is not idempotent — a repeat hits the 409", () => {
  assertEquals(action.idempotent, false);
  assert(/409/.test(action.description ?? ""));
});
