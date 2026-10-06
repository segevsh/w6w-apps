import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/email-send.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("email-send: POST /emails/transactional builds Recipients, Content and Options", async () => {
  const { ctx, calls } = mockCtx([{ body: { TransactionID: "t1", MessageID: "m1" } }]);
  const out = await action.execute({
    to: "a@x.com, b@x.com",
    cc: "c@x.com",
    from: "Me <me@x.com>",
    subject: "Hi",
    bodyHtml: "<b>hi</b>",
    bodyText: "hi",
    merge: { name: "Ada" },
    attachFiles: "f1.pdf",
    channelName: "welcome",
    trackOpens: false,
  }, ctx) as { TransactionID: string };
  assertEquals(out.TransactionID, "t1");
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v4/emails/transactional");
  assertEquals(calls[0].headers["x-elasticemail-apikey"], undefined);
  assertEquals(JSON.parse(calls[0].body!), {
    Recipients: { To: ["a@x.com", "b@x.com"], CC: ["c@x.com"] },
    Content: {
      Body: [
        { ContentType: "HTML", Content: "<b>hi</b>", Charset: "utf-8" },
        { ContentType: "PlainText", Content: "hi", Charset: "utf-8" },
      ],
      From: "Me <me@x.com>",
      Subject: "Hi",
      Merge: { name: "Ada" },
      AttachFiles: ["f1.pdf"],
    },
    Options: { ChannelName: "welcome", TrackOpens: false },
  });
});

Deno.test("email-send: a template alone is enough; no body and no template is refused", async () => {
  const { ctx, calls } = mockCtx([{ body: { TransactionID: "t" } }]);
  await action.execute({ to: "a@x.com", templateName: "welcome" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).Content, { TemplateName: "welcome" });
  assertEquals(JSON.parse(calls[0].body!).Options, undefined);
  await assertRejects(
    async () => await action.execute({ to: "a@x.com" }, mockCtx().ctx),
    Error,
    "template",
  );
});

Deno.test("email-send: requires a recipient and an object for merge fields", async () => {
  await assertRejects(
    async () => await action.execute({ templateName: "t" }, mockCtx().ctx),
    Error,
    "To recipient",
  );
  await assertRejects(
    async () => await action.execute({ to: "a@x.com", bodyText: "x", merge: [1] }, mockCtx().ctx),
    Error,
    "JSON object",
  );
});
