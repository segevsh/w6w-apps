import { assert, assertEquals, assertRejects } from "@std/assert";
import listCreate from "../../actions/list-create.ts";
import { bodyOf, errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-create: POSTs emailmarketing/addlist.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope({ "item": { "id": "900" } }) }]);
  const out = await listCreate.execute(
    {
      "name": "name-value",
      "emailSubject": "emailSubject-value",
      "replyTo": "replyTo-value",
      "fromEmail": "fromEmail-value",
      "fromName": "fromName-value",
      "doubleOptin": true,
      "communications": true,
    } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/addlist.json");
  assertEquals(bodyOf(calls[0]), {
    "name": "name-value",
    "email_subject": "emailSubject-value",
    "reply_to": "replyTo-value",
    "fromemail": "fromEmail-value",
    "from_name": "fromName-value",
    "doubleOptin": "1",
    "communications": "1",
  });
  // The credential is the Auth `sign` hook's job; the action never sets it.
  assertEquals(queryOf(calls[0].url)["key"], undefined);
  assertEquals(out, { "ok": true, "item": { "id": "900" } });
});

Deno.test("list-create: sends a form-encoded body, not a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope({ "item": { "id": "900" } }) }]);
  await listCreate.execute(
    {
      "name": "name-value",
      "emailSubject": "emailSubject-value",
      "replyTo": "replyTo-value",
      "fromEmail": "fromEmail-value",
      "fromName": "fromName-value",
      "doubleOptin": true,
      "communications": true,
    } as never,
    ctx,
  );
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("list-create: is declared non-idempotent", () => {
  assertEquals(listCreate.idempotent, false);
});

Deno.test("list-create: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await listCreate.execute(
        {
          "name": "name-value",
          "emailSubject": "emailSubject-value",
          "replyTo": "replyTo-value",
          "fromEmail": "fromEmail-value",
          "fromName": "fromName-value",
          "doubleOptin": true,
          "communications": true,
        } as never,
        ctx,
      )
    );
    assert((err as Error).message.includes("bad thing"));
  }
});
