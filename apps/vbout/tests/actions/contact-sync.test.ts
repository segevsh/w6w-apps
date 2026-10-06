import { assert, assertEquals, assertRejects } from "@std/assert";
import contactSync from "../../actions/contact-sync.ts";
import { bodyOf, errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-sync: POSTs emailmarketing/synccontact.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  const out = await contactSync.execute(
    {
      "email": "jim@tester.com",
      "listId": "524",
      "ipAddress": "ipAddress-value",
      "status": "active",
      "fields": { "125": "John", "1204": "Doe" },
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/synccontact.json");
  assertEquals(bodyOf(calls[0]), {
    "email": "jim@tester.com",
    "listid": "524",
    "ipaddress": "ipAddress-value",
    "status": "active",
    "fields[125]": "John",
    "fields[1204]": "Doe",
  });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "ok": true, "data": [] });
});

Deno.test("contact-sync: sends a form-encoded body, not a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  await contactSync.execute(
    {
      "email": "jim@tester.com",
      "listId": "524",
      "ipAddress": "ipAddress-value",
      "status": "active",
      "fields": { "125": "John", "1204": "Doe" },
    } as never,
    ctx,
  );
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("contact-sync: is declared idempotent", () => {
  assertEquals(contactSync.idempotent, true);
});

Deno.test("contact-sync: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await contactSync.execute(
        {
          "email": "jim@tester.com",
          "listId": "524",
          "ipAddress": "ipAddress-value",
          "status": "active",
          "fields": { "125": "John", "1204": "Doe" },
        } as never,
        ctx,
      )
    );
    assert((err as Error).message.includes("bad thing"));
  }
});
