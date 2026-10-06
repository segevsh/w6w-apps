import { assert, assertEquals, assertRejects } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { bodyOf, errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-update: POSTs emailmarketing/editcontact.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  const out = await contactUpdate.execute(
    {
      "id": "3",
      "email": "jim@tester.com",
      "ipAddress": "ipAddress-value",
      "status": "active",
      "fields": { "125": "John", "1204": "Doe" },
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/editcontact.json");
  assertEquals(bodyOf(calls[0]), {
    "id": "3",
    "email": "jim@tester.com",
    "ipaddress": "ipAddress-value",
    "status": "active",
    "fields[125]": "John",
    "fields[1204]": "Doe",
  });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "ok": true, "data": [] });
});

Deno.test("contact-update: sends a form-encoded body, not a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  await contactUpdate.execute(
    {
      "id": "3",
      "email": "jim@tester.com",
      "ipAddress": "ipAddress-value",
      "status": "active",
      "fields": { "125": "John", "1204": "Doe" },
    } as never,
    ctx,
  );
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("contact-update: is declared idempotent", () => {
  assertEquals(contactUpdate.idempotent, true);
});

Deno.test("contact-update: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await contactUpdate.execute(
        {
          "id": "3",
          "email": "jim@tester.com",
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
