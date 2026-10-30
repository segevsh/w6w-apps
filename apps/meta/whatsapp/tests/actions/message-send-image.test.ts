import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send-image.ts";

const OK = { messaging_product: "whatsapp", messages: [{ id: "wamid.3" }] };

test("message-send-image: POSTs an image message with the link", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await action.execute({ to: "1", link: "https://example.com/cat.png" }, ctx);
  assertEquals(out, OK);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "image");
  assertEquals(body.image, { link: "https://example.com/cat.png" });
});

test("message-send-image: includes the caption when set, omits it otherwise", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ to: "1", link: "https://example.com/cat.png", caption: "Cute!" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).image, {
    link: "https://example.com/cat.png",
    caption: "Cute!",
  });
});
