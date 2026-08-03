import { assert, assertEquals } from "@std/assert";
import { mockCtx, param } from "../_helpers.ts";
import createPerson from "../../actions/create-person.ts";

Deno.test("create-person: POSTs the documented camelCase body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 10763 } }]);
  await createPerson.execute({
    firstName: "Tom",
    lastName: "Minch",
    stage: "Lead",
    source: "MyWebsite.com",
    emails: [{ value: "tom@example.com", type: "home" }],
    phones: [{ value: "555-555-5555", type: "mobile" }],
    tags: ["Los Angeles"],
    assignedUserId: 8,
    price: 500000,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.followupboss.com/v1/people");
  assertEquals(JSON.parse(calls[0].body!), {
    firstName: "Tom",
    lastName: "Minch",
    stage: "Lead",
    source: "MyWebsite.com",
    price: 500000,
    assignedUserId: 8,
    emails: [{ value: "tom@example.com", type: "home" }],
    phones: [{ value: "555-555-5555", type: "mobile" }],
    tags: ["Los Angeles"],
  });
});

/** `deduplicate` is a QUERY parameter, not a body field. Easy to get wrong. */

/** `deduplicate` is a QUERY parameter, not a body field. Easy to get wrong. */
Deno.test("create-person: sends deduplicate on the query string, not in the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await createPerson.execute({ firstName: "A", deduplicate: true }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("deduplicate"), "true");
  assertEquals(JSON.parse(calls[0].body!), { firstName: "A" });
});

Deno.test("create-person: merges custom fields as flat top-level keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }]);
  await createPerson.execute({
    firstName: "Mary",
    customFields: { customClosePrice: 425000, customBirthday: "1990-02-16" },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    firstName: "Mary",
    customClosePrice: 425000,
    customBirthday: "1990-02-16",
  });
});

/**
 * The single most consequential thing about this endpoint: it runs no
 * automations. If that warning ever falls out of the description, someone will
 * quietly route their lead intake through it.
 */

/**
 * The single most consequential thing about this endpoint: it runs no
 * automations. If that warning ever falls out of the description, someone will
 * quietly route their lead intake through it.
 */
Deno.test("create-person: warns that it does not run lead automations", () => {
  assertEquals(createPerson.type, "perform");
  assertEquals(createPerson.idempotent, false);
  const d = createPerson.description!;
  assert(/automations?/i.test(d), d);
  assert(d.includes("Create Event"), d);
});

Deno.test("create-person: flags source and sourceUrl as write-once", () => {
  assert(param(createPerson, "source").hint?.includes("Write-once"));
  assert(param(createPerson, "sourceUrl").hint?.includes("write-once"));
});
