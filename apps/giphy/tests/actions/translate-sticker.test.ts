import { assertEquals } from "@std/assert";
import translateSticker from "../../actions/translate-sticker.ts";
import { envelope, gif, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("translate-sticker: calls GET /v1/stickers/translate", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(gif("sticker-4")) }]);
  const out = await translateSticker.execute({ s: "thank you" }, ctx) as {
    data: { id: string };
  };

  assertEquals(pathOf(calls[0].url), "/v1/stickers/translate");
  assertEquals(queryOf(calls[0].url), { s: "thank you" });
  assertEquals(out.data.id, "sticker-4");
});

Deno.test("translate-sticker: rating and weirdness are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(gif()) }]);
  await translateSticker.execute({ s: "hi", weirdness: 0 }, ctx);
  // 0 survives: it is a meaningful value, not an absent one.
  assertEquals(queryOf(calls[0].url), { s: "hi", weirdness: "0" });
});
