import { assert, assertEquals, assertRejects } from "@std/assert";
import createContact from "../../actions/create-contact.ts";
import { bodyOf, envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("create-contact: POST /contacts with snake_case body; unset fields omitted", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ contact: { id: "c1" } }) }]);
  const out = await createContact.execute({
    firstName: "Ada",
    lastName: "Lovelace",
    companyName: "Analytical",
    starred: false,
    emails: '[{"type":"work","value":"ada@example.com"}]',
    phones: [{ type: "mobile", value: "123" }],
    tags: "vip, uk",
    statusId: "s1",
  }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v3/contacts");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    first_name: "Ada",
    last_name: "Lovelace",
    company_name: "Analytical",
    starred: false,
    emails: [{ type: "work", value: "ada@example.com" }],
    phones: [{ type: "mobile", value: "123" }],
    tags: ["vip", "uk"],
    status_id: "s1",
  });
  assertEquals(out.contact, { id: "c1" });
});

Deno.test("create-contact: needs a last name or company name before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () => Promise.resolve(createContact.execute({ firstName: "Ada" }, ctx)),
    Error,
  );
  assertEquals(calls.length, 0);
});

Deno.test("create-contact: malformed JSON input is refused with its field name", async () => {
  const { ctx } = mockCtx([]);
  const err = await assertRejects(
    () => Promise.resolve(createContact.execute({ lastName: "L", emails: "{nope" }, ctx)),
    Error,
  );
  assert(err.message.includes("emails"));
});

Deno.test("create-contact: is not idempotent (no idempotency key exists)", () => {
  assertEquals(createContact.idempotent, false);
});

Deno.test("create-contact: validation error carries the vendor's error_name", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorBody("invalid_request_data", "invalid") }]);
  const err = await assertRejects(
    () => Promise.resolve(createContact.execute({ lastName: "L" }, ctx)),
    Error,
  );
  assert(err.message.includes("invalid_request_data"));
});
