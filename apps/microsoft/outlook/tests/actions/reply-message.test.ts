import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/reply-message.ts";

Deno.test("reply-message: POSTs a comment to /reply", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  const out = await action.execute({ messageId: "m1", comment: "on it" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/messages/m1/reply");
  assertEquals(JSON.parse(calls[0].body!), { comment: "on it" });
  assertEquals(out, { status: 202 });
});

Deno.test("reply-message: switches to /replyAll when asked", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  await action.execute({ messageId: "m1", replyAll: true, comment: "all" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/messages/m1/replyAll");
});

Deno.test("reply-message: nests body and extra recipients under `message`", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  await action.execute({
    messageId: "m1",
    bodyContent: "<p>done</p>",
    bodyType: "HTML",
    to: ["extra@x.com"],
  }, ctx);

  assertEquals(JSON.parse(calls[0].body!), {
    message: {
      body: { contentType: "HTML", content: "<p>done</p>" },
      toRecipients: [{ emailAddress: { address: "extra@x.com" } }],
    },
  });
});

Deno.test("reply-message: rejects comment+body locally, as Graph would with a 400", () => {
  const { ctx, calls } = mockCtx();
  assertThrows(
    () => action.execute({ messageId: "m1", comment: "a", bodyContent: "b" }, ctx),
    Error,
    "not both",
  );
  // The guard fires before any request is made.
  assertEquals(calls.length, 0);
});

Deno.test("reply-message: omits `message` entirely when only a comment is given", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  await action.execute({ messageId: "m1", comment: "hi" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).message, undefined);
});

Deno.test("reply-message: forwards the time zone as a Prefer header", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: undefined }]);
  await action.execute({ messageId: "m1", comment: "x", timeZone: "UTC" }, ctx);
  assertEquals(calls[0].headers["prefer"], 'outlook.timezone="UTC"');
});
