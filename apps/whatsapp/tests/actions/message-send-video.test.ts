import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send-video.ts";

const OK = { messaging_product: "whatsapp", messages: [{ id: "wamid.5" }] };

Deno.test("message-send-video: POSTs a video message with the link", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await action.execute({ to: "1", link: "https://example.com/clip.mp4" }, ctx);
  assertEquals(out, OK);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.type, "video");
  assertEquals(body.video, { link: "https://example.com/clip.mp4" });
});

Deno.test("message-send-video: includes the caption when set", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ to: "1", link: "https://example.com/clip.mp4", caption: "Look!" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).video, {
    link: "https://example.com/clip.mp4",
    caption: "Look!",
  });
});
