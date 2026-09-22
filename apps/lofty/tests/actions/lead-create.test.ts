import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-create.ts";

Deno.test("lead-create: posts the documented body and returns the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { leadId: 651095960136641 } }]);
  const result = await action.execute!({
    firstName: "Bob",
    lastName: "Li",
    emails: "jane.doe@example.com,jdoe-work@company.com",
    phones: "+14155551234,+12125559876",
    leadTypes: "2,5",
    assignedUserId: 10000000514,
    tags: "Hot Lead,Zillow",
    tagsAdd: "Referral",
    welcomeEmail: true,
  }, ctx) as { leadId: number };

  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/leads");
  assertEquals(JSON.parse(calls[0].body!), {
    firstName: "Bob",
    lastName: "Li",
    emails: ["jane.doe@example.com", "jdoe-work@company.com"],
    phones: ["+14155551234", "+12125559876"],
    leadTypes: [2, 5],
    assignedUserId: 10000000514,
    tags: ["Hot Lead", "Zillow"],
    tagsAdd: ["Referral"],
    welcomeEmail: true,
  });
  assertEquals(result.leadId, 651095960136641);
});

Deno.test("lead-create: unset fields are omitted, not sent as empty strings", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { leadId: 1 } }]);
  await action.execute!({ firstName: "Bob" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { firstName: "Bob" });
});

Deno.test("lead-create: a json property object survives the body round-trip", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { leadId: 1 } }]);
  await action.execute!({
    firstName: "Bob",
    property: { streetAddress: "1600 Pennsylvania Avenue NW", city: "Washington DC" },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).property, {
    streetAddress: "1600 Pennsylvania Avenue NW",
    city: "Washington DC",
  });
});

Deno.test("lead-create: not idempotent — a retry creates a second lead", () => {
  assertEquals(action.idempotent, false);
  assertEquals(action.type, "perform");
});
