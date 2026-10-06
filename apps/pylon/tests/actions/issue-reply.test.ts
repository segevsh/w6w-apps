import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/issue-reply.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("issue-reply: POSTs message_id, body and email recipients", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "m9", issue_id: "i1" } } }]);
  const out = await action.execute!({
    id: "i1",
    messageId: "m1",
    bodyHtml: "<p>hi</p>",
    toEmails: "a@b.com, c@d.com",
    ccEmails: ["e@f.com"],
    userId: "u1",
  }, ctx);
  assertEquals(calls[0].url, "https://api.usepylon.com/issues/i1/reply");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    message_id: "m1",
    body_html: "<p>hi</p>",
    email_info: { to_emails: ["a@b.com", "c@d.com"], cc_emails: ["e@f.com"] },
    user_id: "u1",
  });
  assertEquals(out, { id: "m9", issue_id: "i1" });
});

Deno.test("issue-reply: no recipients means no email_info; message and body are required", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ id: "i1", messageId: "m1", bodyHtml: "x" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { message_id: "m1", body_html: "x" });
  assertEquals(
    action.params!.filter((p) => p.required).map((p) => p.key),
    ["id", "messageId", "bodyHtml"],
  );
  assertEquals(action.idempotent, false);
});

Deno.test("issue-reply: an internal-issue refusal is reported by code", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { errors: ["no"], code: "internal_issue_reply_not_allowed" },
  }]);
  await assertRejects(
    async () => await action.execute!({ id: "i1", messageId: "m", bodyHtml: "x" }, ctx),
    Error,
    "(internal_issue_reply_not_allowed)",
  );
});
