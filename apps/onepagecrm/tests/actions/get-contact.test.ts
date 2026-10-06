import { assert, assertEquals, assertRejects } from "@std/assert";
import getContact from "../../actions/get-contact.ts";
import { envelope, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("get-contact: GET /contacts/{id} returns the data object", async () => {
  const { ctx, calls } = mockCtx([{
    body: envelope({ contact: { id: "c 1" }, next_actions: [{ id: "a1" }] }),
  }]);
  const out = await getContact.execute({ contactId: "c 1" }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v3/contacts/c%201");
  assertEquals(out.contact, { id: "c 1" });
  assertEquals((out.next_actions as unknown[]).length, 1);
});

Deno.test("get-contact: a blank id is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(() => Promise.resolve(getContact.execute({ contactId: " " }, ctx)), Error);
  assertEquals(calls.length, 0);
});

Deno.test("get-contact: 404 resource_not_found is reported", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: errorBody("resource_not_found", "Not found", 404),
  }]);
  const err = await assertRejects(
    () => Promise.resolve(getContact.execute({ contactId: "x" }, ctx)),
    Error,
  );
  assert(err.message.includes("HTTP 404") && err.message.includes("resource_not_found"));
});
