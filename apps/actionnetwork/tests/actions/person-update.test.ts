import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/person-update.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT: Record<string, unknown> = {
  "personId": "action_network:personid",
  "email": "a@b.co",
  "phone": "phone text",
  "givenName": "givenName text",
  "familyName": "familyName text",
  "addressLine": "addressLine text",
  "city": "city text",
  "region": "region text",
  "postalCode": "postalCode text",
  "country": "country text",
  "language": "language text",
  "emailStatus": "subscribed",
  "phoneStatus": "subscribed",
  "customFields": {
    "k": "v",
  },
  "backgroundRequest": true,
};

const REPLY = { identifiers: ["action_network:abc"], x: 1, _links: {} };

Deno.test("person-update: sends PUT with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await action.execute!(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    calls[0].url,
    "https://actionnetwork.org/api/v2/people/personid?background_request=true",
  );
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "given_name": "givenName text",
    "family_name": "familyName text",
    "email_addresses": [
      {
        "address": "a@b.co",
        "status": "subscribed",
      },
    ],
    "phone_numbers": [
      {
        "number": "phone text",
        "status": "subscribed",
      },
    ],
    "postal_addresses": [
      {
        "address_lines": [
          "addressLine text",
        ],
        "locality": "city text",
        "region": "region text",
        "postal_code": "postalCode text",
        "country": "country text",
      },
    ],
    "languages_spoken": [
      "language text",
    ],
    "custom_fields": {
      "k": "v",
    },
  });
  assertEquals(out, {
    "id": "abc",
    "identifiers": [
      "action_network:abc",
    ],
    "x": 1,
  });
});

Deno.test("person-update: sends no credential header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await action.execute!(INPUT, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
  assert(!("osdi-api-token" in calls[0].headers), "the sign hook injects credentials, not actions");
  assertEquals(calls[0].headers.accept, "application/hal+json, application/json");
});

Deno.test("person-update: surfaces a vendor error and never echoes the key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "API Key invalid or not present sk_live_SECRET" },
  }]);
  const err = await assertRejects(async () => await action.execute!(INPUT, ctx), Error, "HTTP 401");
  assert(
    !String(err.message).includes("sk_live_SECRET"),
    "the vendor echoes the key; it must be cut",
  );
});

Deno.test("person-update: declares its type, params and output", () => {
  assertEquals(action.key, "person-update");
  assertEquals(action.resource, "person");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assert(action.params!.length === 15);
  assertEquals(Array.isArray(action.output) ? action.output.length : 0, 11);
});
