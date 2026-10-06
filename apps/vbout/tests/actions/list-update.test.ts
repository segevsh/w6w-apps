import { assert, assertEquals, assertRejects } from "@std/assert";
import listUpdate from "../../actions/list-update.ts";
import { bodyOf, errorEnvelope, mockCtx, okEnvelope, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-update: POSTs emailmarketing/editlist.json with the documented parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  const out = await listUpdate.execute(
    {
      "id": "3",
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
  assertEquals(pathOf(calls[0].url), "/1/emailmarketing/editlist.json");
  assertEquals(bodyOf(calls[0]), {
    "id": "3",
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
  assertEquals(out, { "ok": true, "data": [] });
});

Deno.test("list-update: sends a form-encoded body, not a query string", async () => {
  const { ctx, calls } = mockCtx([{ body: okEnvelope([]) }]);
  await listUpdate.execute(
    {
      "id": "3",
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

Deno.test("list-update: is declared idempotent", () => {
  assertEquals(listUpdate.idempotent, true);
});

Deno.test("list-update: an error envelope rejects with the vendor's message, whatever the status", async () => {
  for (const status of [200, 401]) {
    const { ctx } = mockCtx([{ status, body: errorEnvelope(1002, "bad thing") }]);
    const err = await assertRejects(async () =>
      await listUpdate.execute(
        {
          "id": "3",
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
