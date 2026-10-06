import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/email-send.ts";
import { jsonBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("email-send: POST /email/send builds recipients, from, domain and template", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      status: "success",
      hasError: false,
      data: { unique_id: "a1d2" },
      message: "Thank you. Your request has been queued.",
    },
  }]);
  const out = await action.execute({
    templateId: "global_otp",
    domain: "z.mailer91.com",
    fromEmail: "info@z.mailer91.com",
    fromName: "ABC",
    to: "joe@x.com, ann@x.com",
    cc: "c@x.com",
    bcc: "b@x.com",
    replyTo: "r@x.com",
    variables: { otp: "1234" },
    attachments: [{ fileName: "a.pdf", filePath: "https://x/a.pdf" }],
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v5/email/send");
  assertEquals(jsonBody(calls[0]), {
    recipients: [{
      to: [{ email: "joe@x.com" }, { email: "ann@x.com" }],
      cc: [{ email: "c@x.com" }],
      bcc: [{ email: "b@x.com" }],
      variables: { otp: "1234" },
    }],
    from: { email: "info@z.mailer91.com", name: "ABC" },
    domain: "z.mailer91.com",
    template_id: "global_otp",
    reply_to: [{ email: "r@x.com" }],
    attachments: [{ fileName: "a.pdf", filePath: "https://x/a.pdf" }],
  });
  assertEquals(out, { uniqueId: "a1d2", message: "Thank you. Your request has been queued." });
});

Deno.test("email-send: minimal input omits cc, bcc, reply_to and attachments", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", hasError: false, data: {} } }]);
  await action.execute({
    templateId: "t",
    domain: "d",
    fromEmail: "a@d",
    to: "x@y.com",
  }, ctx);
  const body = jsonBody(calls[0]) as Record<string, unknown>;
  assertEquals(body.recipients, [{ to: [{ email: "x@y.com" }] }]);
  assertEquals(body.from, { email: "a@d" });
  for (const k of ["reply_to", "attachments"]) assertEquals(k in body, false);
});

Deno.test("email-send: requires at least one recipient", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(async () =>
    await action.execute({ templateId: "t", domain: "d", fromEmail: "a@d", to: "" }, ctx)
  );
});

Deno.test("email-send: a 401 fail envelope fails the step", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { status: "fail", hasError: true, errors: "Unauthorized", code: "401" },
  }]);
  const err = await assertRejects(async () =>
    await action.execute({ templateId: "t", domain: "d", fromEmail: "a@d", to: "x@y.com" }, ctx)
  ) as Error;
  assert(err.message.includes("Unauthorized"));
});

Deno.test("email-send: puts no credential on the request (sign owns that)", async () => {
  const { ctx, calls } = mockCtx([{
    body: { status: "success", hasError: false, data: { unique_id: "u" }, message: "queued" },
  }]);
  await action.execute({
    templateId: "t",
    domain: "d.mailer91.com",
    fromEmail: "a@d.mailer91.com",
    to: "x@y.com",
  }, ctx);
  assertEquals(calls[0].headers.authkey, undefined);
  assert(!calls[0].url.toLowerCase().includes("authkey"));
  assert(calls[0].url.startsWith("https://control.msg91.com/api/v5/"));
});

Deno.test("email-send: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ body: { type: "error", message: "Auth Key missing" } }]);
  const err = await assertRejects(async () =>
    await action.execute({
      templateId: "t",
      domain: "d.mailer91.com",
      fromEmail: "a@d.mailer91.com",
      to: "x@y.com",
    }, ctx)
  ) as Error;
  assert(err.message.includes("Auth Key missing"));
});
