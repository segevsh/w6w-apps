import { assertEquals, assertRejects } from "@std/assert";
import translate from "../../actions/youtube-transcript-translate.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("youtube-transcript-translate: GETs /youtube/transcript/translate with lang and the url", async () => {
  const body = { content: "hola", lang: "es" };
  const { ctx, calls } = mockCtx([{ body }]);
  const out = await translate.execute({
    url: "https://youtu.be/x",
    videoId: "ignored",
    lang: "es",
    text: true,
  }, ctx);
  assertEquals(out, body);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/youtube/transcript/translate");
  assertEquals(Object.fromEntries(url.searchParams), {
    url: "https://youtu.be/x",
    lang: "es",
    text: "true",
  });
});

Deno.test("youtube-transcript-translate: a video id alone works; no source or no lang makes no call", async () => {
  const { ctx, calls } = mockCtx([{ body: { content: [], lang: "fr" } }]);
  await translate.execute({ videoId: "abc", lang: "fr", chunkSize: 100 }, ctx);
  assertEquals(Object.fromEntries(new URL(calls[0].url).searchParams), {
    videoId: "abc",
    lang: "fr",
    chunkSize: "100",
  });
  const none = mockCtx();
  await assertRejects(
    async () => await translate.execute({ lang: "fr" }, none.ctx),
    Error,
    "video URL or a video id",
  );
  await assertRejects(
    async () => await translate.execute({ videoId: "a", lang: "" }, none.ctx),
    Error,
    "required",
  );
  assertEquals(none.calls.length, 0);
});
