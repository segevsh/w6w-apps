import { assertEquals, assertRejects } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "contactId": "x-contactId",
  "firstName": "x-firstName",
  "lastName": "x-lastName",
  "email": "x-email",
  "phoneNumber": "x-phoneNumber",
  "address": "x-address",
  "websiteUrl": "x-websiteUrl",
  "companyName": "x-companyName",
  "jobTitle": "x-jobTitle",
  "companyType": "x-companyType",
  "privateNotes": "x-privateNotes",
  "preferred": true,
  "clientOrganization": { "name": "Acme" },
  "customFields": [{ "schema_id": "s1", "value": ["v"] }],
  "smsConsentConfirmed": true,
  "include": ["user", "action_suggestions"],
  "maxActionSuggestions": 5,
  "maxWorkspaces": 5,
  "maxTags": 5,
  "maxCustomFields": 5,
};

Deno.test("contact-update: sends PATCH /contacts/{id} with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  const out = await contactUpdate.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/api/v3/contacts/x-contactId");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "first_name": "x-firstName",
    "last_name": "x-lastName",
    "email": "x-email",
    "phone_number": "x-phoneNumber",
    "address": "x-address",
    "website_url": "x-websiteUrl",
    "company_name": "x-companyName",
    "job_title": "x-jobTitle",
    "company_type": "x-companyType",
    "private_notes": "x-privateNotes",
    "preferred": true,
    "client_organization": { "name": "Acme" },
    "custom_fields": [{ "schema_id": "s1", "value": ["v"] }],
    "sms_consent_confirmed": true,
    "include": ["user", "action_suggestions"],
    "max_action_suggestions": 5,
    "max_workspaces": 5,
    "max_tags": 5,
    "max_custom_fields": 5,
  });
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("contact-update: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await contactUpdate.execute({ "contactId": "x-contactId" } as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
});

Deno.test("contact-update: percent-encodes path ids", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "r1", marker: "m" } }]);
  await contactUpdate.execute({ ...INPUT, ...{ "contactId": "a/b" } }, ctx);
  const segs = pathOf(calls[0].url).split("/");
  assertEquals(segs.includes("a%2Fb"), true);
});

Deno.test("contact-update: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await contactUpdate.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
