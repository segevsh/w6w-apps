import { assert, assertEquals, assertRejects } from "@std/assert";
import contactGetByEmail from "../../actions/contact-get-by-email.ts";
import { errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-get-by-email: GETs emailmarketing/getcontactbyemail.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "contact": { "id": "3", "email": "jim@tester.com" } }),
  }]);
  const out = await contactGetByEmail.execute(
    { "email": "jim@tester.com", "listId": "524" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/getcontactbyemail.json");
  assertEquals(queryOf(calls[0].url), { "email": "jim@tester.com", "listid": "524" });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "contact": { "id": "3", "email": "jim@tester.com" } });
});

Deno.test("contact-get-by-email: is a read with no request body", async () => {
  const { ctx, calls } = mockCtx([{
    body: okEnvelope({ "contact": { "id": "3", "email": "jim@tester.com" } }),
  }]);
  await contactGetByEmail.execute({ "email": "jim@tester.com", "listId": "524" } as never, ctx);
  assertEquals(calls[0].body, null);
  assertEquals(contactGetByEmail.type, "read");
});

Deno.test("contact-get-by-email: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await contactGetByEmail.execute({ "email": "jim@tester.com", "listId": "524" } as never, ctx)
    );
    assert((err as Error).message.includes("bad thing"));
  }
});
