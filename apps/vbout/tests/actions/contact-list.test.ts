import { assert, assertEquals, assertRejects } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: GETs emailmarketing/getcontacts.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({
      "contacts": { "count": 1, "items": [{ "id": "3", "email": "jim@tester.com" }] },
    }),
  }]);
  const out = await contactList.execute({ "listId": "524" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/getcontacts.json");
  assertEquals(queryOf(calls[0].url), { "listid": "524" });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, {
    "contacts": { "count": 1, "items": [{ "id": "3", "email": "jim@tester.com" }] },
  });
});

Deno.test("contact-list: is a read with no request body", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({
      "contacts": { "count": 1, "items": [{ "id": "3", "email": "jim@tester.com" }] },
    }),
  }]);
  await contactList.execute({ "listId": "524" } as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(contactList.type, "read");
});

Deno.test("contact-list: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await contactList.execute({ "listId": "524" } as never, ctx)
    );
    assert((err as Error).message.includes("bad thing"));
  }
});
