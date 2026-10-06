import { assert, assertEquals, assertRejects } from "@std/assert";
import emailSend from "../../actions/email-send.ts";
import { formOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("email-send: POST /api/1/sendOne/ with the documented form fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  const out = await emailSend.execute({
    "from_email": "me@example.com",
    "to_email": "you@example.com",
    "subject": "Hi",
    "body": "<p>Hi</p>",
    "template_id": "3",
    "merge_tags": { "name": "Ann" },
    "cc_email": "cc@example.com",
    "bcc_email": "bcc@example.com",
    "category": "receipts",
    "program_date": "01/12/2026 10:00",
  } as never, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/sendOne/");
  assert(calls[0].url.startsWith("https://acumbamail.com/"));
  assertEquals(formOf(calls[0]), {
    "from_email": "me@example.com",
    "to_email": "you@example.com",
    "subject": "Hi",
    "body": "<p>Hi</p>",
    "template_id": "3",
    "merge_tags[name]": "Ann",
    "cc_email": "cc@example.com",
    "bcc_email": "bcc@example.com",
    "category": "receipts",
    "program_date": "01/12/2026 10:00",
  });
  // the credential is stamped by `sign`, never by the action
  assert(!(calls[0].body ?? "").includes("auth_token"));
  assertEquals(out, { result: { sample: "ok" } });
});

Deno.test("email-send: a vendor error surfaces its status and body", async () => {
  const { ctx } = mockCtx([{ status: 400, body: "Invalid argument" }]);
  const err = await assertRejects(async () =>
    await emailSend.execute({
      "from_email": "me@example.com",
      "to_email": "you@example.com",
      "subject": "Hi",
      "body": "<p>Hi</p>",
      "template_id": "3",
      "merge_tags": { "name": "Ann" },
      "cc_email": "cc@example.com",
      "bcc_email": "bcc@example.com",
      "category": "receipts",
      "program_date": "01/12/2026 10:00",
    } as never, ctx)
  );
  assert(String((err as Error).message).includes("(400)"));
  assert(String((err as Error).message).includes("Invalid argument"));
});

Deno.test("email-send: an empty from_email fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await emailSend.execute({
        "from_email": "  ",
        "to_email": "you@example.com",
        "subject": "Hi",
        "body": "<p>Hi</p>",
        "template_id": "3",
        "merge_tags": { "name": "Ann" },
        "cc_email": "cc@example.com",
        "bcc_email": "bcc@example.com",
        "category": "receipts",
        "program_date": "01/12/2026 10:00",
      } as never, ctx),
    Error,
    "from_email is required",
  );
  assertEquals(calls.length, 0);
});

Deno.test("email-send: unset optional fields are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { sample: "ok" } }]);
  await emailSend.execute(
    { "from_email": "me@example.com", "to_email": "you@example.com", "subject": "Hi" } as never,
    ctx,
  );
  assertEquals(formOf(calls[0]), {
    "from_email": "me@example.com",
    "to_email": "you@example.com",
    "subject": "Hi",
  });
});
