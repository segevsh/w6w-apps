import { assert, assertEquals, assertRejects } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { bodyOf, errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs emailmarketing/addcontact.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope({ "item": { "id": "14523" } }) }]);
  const out = await contactCreate.execute(
    {
      "listId": "524",
      "status": "active",
      "email": "jim@tester.com",
      "ipAddress": "ipAddress-value",
      "fields": { "125": "John", "1204": "Doe" },
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/addcontact.json");
  assertEquals(bodyOf(calls[0]), {
    "listid": "524",
    "status": "active",
    "email": "jim@tester.com",
    "ipaddress": "ipAddress-value",
    "fields[125]": "John",
    "fields[1204]": "Doe",
  });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "ok": true, "item": { "id": "14523" } });
});

Deno.test("contact-create: sends a form-encoded body, not a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope({ "item": { "id": "14523" } }) }]);
  await contactCreate.execute(
    {
      "listId": "524",
      "status": "active",
      "email": "jim@tester.com",
      "ipAddress": "ipAddress-value",
      "fields": { "125": "John", "1204": "Doe" },
    } as never,
    ctx,
  );
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("contact-create: is declared non-idempotent", () => {
  assertEquals(contactCreate.idempotent, false);
});

Deno.test("contact-create: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await contactCreate.execute(
        {
          "listId": "524",
          "status": "active",
          "email": "jim@tester.com",
          "ipAddress": "ipAddress-value",
          "fields": { "125": "John", "1204": "Doe" },
        } as never,
        ctx,
      )
    );
    assert((err as Error).message.includes("bad thing"));
  }
});
