import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import sendContent from "../../actions/send-content.ts";

const BLOCK = {
  version: "v2",
  content: { messages: [{ type: "text", text: "hi" }] },
};

Deno.test("send-content: POSTs subscriber_id and the block payload", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await sendContent.execute!({ subscriberId: "555", data: BLOCK }, ctx);
  assertEquals(calls[0].url, "https://api.manychat.com/fb/sending/sendContent");
  assertEquals(JSON.parse(calls[0].body!), { subscriber_id: "555", data: BLOCK });
});

Deno.test("send-content: the Dynamic Block payload is forwarded byte-for-byte", async () => {
  // The OpenAPI document declares no structure for `data`; the schema lives in
  // github.com/manychat/dynamic_block_docs and is versioned separately. Any
  // reshaping here would be this app inventing a vocabulary the API does not
  // publish.
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  const exotic = {
    version: "v2",
    content: {
      messages: [{
        type: "cards",
        elements: [{ title: "t", buttons: [] }],
        image_aspect_ratio: "square",
      }],
      quick_replies: [{ type: "node", caption: "More", target: "Next" }],
      actions: [{ action: "add_tag", tag_name: "clicked" }],
    },
  };
  await sendContent.execute!({ subscriberId: "1", data: exotic }, ctx);
  assertEquals(JSON.parse(calls[0].body!).data, exotic);
});

Deno.test("send-content: omits messageTag and otnTopicName when unset", async () => {
  // Attaching a tag by default would put words in the sender's mouth about why
  // they are permitted to message outside the window.
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await sendContent.execute!({ subscriberId: "1", data: BLOCK }, ctx);
  const body = JSON.parse(calls[0].body!);
  assert(!("message_tag" in body));
  assert(!("otn_topic_name" in body));
});

Deno.test("send-content: forwards the message tag when the window needs opening", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await sendContent.execute!(
    { subscriberId: "1", data: BLOCK, messageTag: "ACCOUNT_UPDATE" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).message_tag, "ACCOUNT_UPDATE");
});

Deno.test("send-content: forwards the OTN topic NAME", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  await sendContent.execute!(
    { subscriberId: "1", data: BLOCK, otnTopicName: "Channel news" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).otn_topic_name, "Channel news");
});

Deno.test("send-content: message tag is free text, not a stale dropdown of Meta's list", () => {
  const tag = sendContent.params?.find((p) => p.key === "messageTag");
  assertEquals(tag?.type, "string");
  assertEquals(tag?.options, undefined);
});

Deno.test("send-content: the description warns that success is acceptance, not delivery", () => {
  assert(/not delivered|acceptance/i.test(sendContent.description!), sendContent.description);
});

Deno.test("send-content: is never idempotent — a retry delivers twice", () => {
  assertEquals(sendContent.idempotent, false);
});
