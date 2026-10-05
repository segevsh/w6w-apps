import { assertEquals, assertRejects } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

const INPUT = {
  "kind": "client",
  "fullName": "x-fullName",
  "email": "x-email",
  "phoneNumber": "x-phoneNumber",
  "address": "x-address",
  "websiteUrl": "x-websiteUrl",
  "companyName": "x-companyName",
  "jobTitle": "x-jobTitle",
  "companyType": "x-companyType",
  "privateNotes": "x-privateNotes",
  "source": "manual",
  "clientOrganization": { "name": "Acme" },
  "customFields": [{ "schema_id": "s1", "value": ["v"] }],
  "smsConsentConfirmed": true,
  "interaction": { "type": "manual" },
  "include": ["user", "action_suggestions"],
  "maxActionSuggestions": 5,
  "maxWorkspaces": 5,
  "maxTags": 5,
  "maxCustomFields": 5,
};

Deno.test("contact-create: sends POST /contacts with the mapped fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "r1", marker: "m" } }]);
  const out = await contactCreate.execute(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/contacts");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "kind": "client",
    "full_name": "x-fullName",
    "email": "x-email",
    "phone_number": "x-phoneNumber",
    "address": "x-address",
    "website_url": "x-websiteUrl",
    "company_name": "x-companyName",
    "job_title": "x-jobTitle",
    "company_type": "x-companyType",
    "private_notes": "x-privateNotes",
    "source": "manual",
    "client_organization": { "name": "Acme" },
    "custom_fields": [{ "schema_id": "s1", "value": ["v"] }],
    "sms_consent_confirmed": true,
    "interaction": { "type": "manual" },
    "include": ["user", "action_suggestions"],
    "max_action_suggestions": 5,
    "max_workspaces": 5,
    "max_tags": 5,
    "max_custom_fields": 5,
  });
  assertEquals(out, { id: "r1", marker: "m" });
});

Deno.test("contact-create: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "r1", marker: "m" } }]);
  await contactCreate.execute({ "email": "x-email" } as never, ctx);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(typeof calls[0].body, "string");
});

Deno.test("contact-create: surfaces the API error type and message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: errorBody("HBObjectNotFoundError", "not found") }]);
  await assertRejects(
    async () => await contactCreate.execute(INPUT, ctx),
    Error,
    "HBObjectNotFoundError",
  );
});
