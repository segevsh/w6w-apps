import { assert, assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import action from "../../actions/create-person.ts";

Deno.test("create-person: POSTs to /people with the snake_case body Copper documents", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 27140448 } }]);
  await action.execute({
    name: "My Contact",
    emails: [{ email: "mycontact@example.com", category: "work" }],
    phoneNumbers: [{ number: "415-123-45678", category: "mobile" }],
    address: { street: "123 Main Street", city: "Savannah" },
    socials: [{ url: "https://x.com/c", category: "twitter" }],
    websites: [{ url: "https://example.com", category: "work" }],
    title: "VP",
    details: "notes",
    companyId: 2,
    contactTypeId: 451492,
    assigneeId: 137658,
    tags: ["vip"],
    customFields: [{ custom_field_definition_id: 100764, value: "x" }],
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.copper.com/developer_api/v1/people");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "My Contact",
    emails: [{ email: "mycontact@example.com", category: "work" }],
    phone_numbers: [{ number: "415-123-45678", category: "mobile" }],
    address: { street: "123 Main Street", city: "Savannah" },
    socials: [{ url: "https://x.com/c", category: "twitter" }],
    websites: [{ url: "https://example.com", category: "work" }],
    title: "VP",
    details: "notes",
    company_id: 2,
    contact_type_id: 451492,
    assignee_id: 137658,
    tags: ["vip"],
    custom_fields: [{ custom_field_definition_id: 100764, value: "x" }],
  });
});

Deno.test("create-person: sends only name when nothing else is supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }]);
  await action.execute({ name: "Solo" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { name: "Solo" });
});

Deno.test("create-person: is a non-idempotent perform requiring only a name", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
  assertEquals(param(action, "name").required, true);
  const required = (action.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["name"]);
});

Deno.test("create-person: custom fields are an ARRAY of definition-id/value pairs", () => {
  const p = param(action, "customFields");
  assertEquals(p.type, "json");
  assert(p.hint?.includes("custom_field_definition_id"));
});
