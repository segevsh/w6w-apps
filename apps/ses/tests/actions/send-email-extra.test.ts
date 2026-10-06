import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import sendEmail from "../../actions/send-email.ts";
import sendTemplated from "../../actions/send-templated-email.ts";
import sendBulk from "../../actions/send-bulk-email.ts";

Deno.test("send-email: refuses a message with neither a text nor an HTML body", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(sendEmail.execute!({ from: "a@x.com", to: "b@x.com", subject: "s" }, ctx)),
    Error,
    "text body, an HTML body",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-email: refuses an empty To list without calling SES", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        sendEmail.execute!({ from: "a@x.com", to: " , ", subject: "s", textBody: "t" }, ctx),
      ),
    Error,
    "At least one To address",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-email: a text-only message carries no Html member; omitted lists are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { MessageId: "m" } }]);
  await sendEmail.execute!({ from: "a@x.com", to: "b@x.com", subject: "s", textBody: "t" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.Content.Simple.Body, { Text: { Data: "t", Charset: "UTF-8" } });
  assertEquals("CcAddresses" in body.Destination, false);
  assertEquals("EmailTags" in body, false);
});

Deno.test("send-email: accepts tags as a name/value array and as a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: { MessageId: "m" } }, { body: { MessageId: "m" } }]);
  const base = { from: "a@x.com", to: "b@x.com", subject: "s", textBody: "t" };
  await sendEmail.execute!({ ...base, tags: [{ name: "k", value: "v" }] }, ctx);
  await sendEmail.execute!({ ...base, tags: '{"k":"v"}' }, ctx);
  for (const c of calls) {
    assertEquals(JSON.parse(c.body!).EmailTags, [{ Name: "k", Value: "v" }]);
  }
});

Deno.test("send-email: malformed tags JSON is a descriptive error", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(
        sendEmail.execute!(
          { from: "a@x.com", to: "b@x.com", subject: "s", textBody: "t", tags: "{nope" },
          ctx,
        ),
      ),
    Error,
    "Tags is not valid JSON",
  );
});

Deno.test("send-templated-email: defaults TemplateData to an empty object and passes a string through", async () => {
  const { ctx, calls } = mockCtx([{ body: { MessageId: "m" } }, { body: { MessageId: "m" } }]);
  const base = { from: "a@x.com", to: "b@x.com", templateName: "t" };
  await sendTemplated.execute!(base, ctx);
  await sendTemplated.execute!({ ...base, templateData: '{"a":1}' }, ctx);
  assertEquals(JSON.parse(calls[0].body!).Content.Template.TemplateData, "{}");
  assertEquals(JSON.parse(calls[1].body!).Content.Template.TemplateData, '{"a":1}');
});

Deno.test("send-bulk-email: rejects an empty, malformed, or over-50 entry list before calling SES", async () => {
  const { ctx, calls } = mockCtx([]);
  const base = { from: "a@x.com", templateName: "t" };
  await assertRejects(
    () => Promise.resolve(sendBulk.execute!({ ...base, entries: [] }, ctx)),
    Error,
    "non-empty array",
  );
  await assertRejects(
    () => Promise.resolve(sendBulk.execute!({ ...base, entries: "[{" }, ctx)),
    Error,
    "Entries is not valid JSON",
  );
  const many = Array.from({ length: 51 }, (_, i) => ({ to: `u${i}@x.com` }));
  await assertRejects(
    () => Promise.resolve(sendBulk.execute!({ ...base, entries: many }, ctx)),
    Error,
    "at most 50",
  );
  assertEquals(calls.length, 0);
});

Deno.test("send-bulk-email: a 200 with failed entries is reported, not thrown", async () => {
  const { ctx } = mockCtx([{
    body: {
      BulkEmailEntryResults: [{ Status: "ACCOUNT_THROTTLED" }, { Status: "ACCOUNT_THROTTLED" }],
    },
  }]);
  const out = await sendBulk.execute!(
    { from: "a@x.com", templateName: "t", entries: [{ to: "a@x.com" }, { to: "b@x.com" }] },
    ctx,
  );
  assertEquals(out.successCount, 0);
  assertEquals(out.failureCount, 2);
});
