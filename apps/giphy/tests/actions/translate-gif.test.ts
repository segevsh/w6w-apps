import { assertEquals } from "@std/assert";
import translateGif from "../../actions/translate-gif.ts";
import { envelope, gif, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("translate-gif: calls GET /v1/gifs/translate with the phrase and returns one object", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(gif()) }]);
  const out = await translateGif.execute({ s: "excited about shipping" }, ctx) as {
    data: { slug: string };
  };

  assertEquals(pathOf(calls[0].url), "/v1/gifs/translate");
  assertEquals(queryOf(calls[0].url), { s: "excited about shipping" });
  assertEquals(out.data.slug, "abc123-fixture");
});

Deno.test("translate-gif: rating and weirdness are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope(gif()) }]);
  await translateGif.execute({ s: "hello", rating: "pg", weirdness: 7 }, ctx);
  assertEquals(queryOf(calls[0].url), { s: "hello", rating: "pg", weirdness: "7" });
});

Deno.test("translate-gif: the phrase is required", () => {
  assertEquals(translateGif.type, "read");
  assertEquals(translateGif.params?.find((p) => p.key === "s")?.required, true);
});
