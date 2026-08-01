import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tweet-create.ts";

Deno.test("tweet-create: POSTs /tweets with just text", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "1", text: "hi" } } }]);
  const out = await action.execute({ text: "hi" }, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.x.com/2/tweets");
  assertEquals(JSON.parse(calls[0].body!), { text: "hi" });
  assertEquals(out, { id: "1", text: "hi" });
});

Deno.test("tweet-create: adds reply and quote-tweet fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "1", text: "hi" } } }]);
  await action.execute({ text: "hi", replyToTweetId: "10", quoteTweetId: "20" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.reply, { in_reply_to_tweet_id: "10" });
  assertEquals(body.quote_tweet_id, "20");
});

Deno.test("tweet-create: uploads media first (INIT/APPEND/FINALIZE) then attaches media_ids", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: { id: "media1" } } }, // INIT
    { body: { data: { id: "media1" } } }, // APPEND
    { body: { data: { id: "media1" } } }, // FINALIZE, no processing_info -> done
    { body: { data: { id: "1", text: "" } } }, // POST /tweets
  ]);
  const png1x1 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  await action.execute({ media: png1x1 }, ctx);

  assertEquals(calls.length, 4);
  assertEquals(calls[0].url, "https://api.x.com/2/media/upload");
  assertEquals(calls[0].form?.get("command"), "INIT");
  assertEquals(calls[0].form?.get("media_type"), "image/png");
  assertEquals(calls[1].form?.get("command"), "APPEND");
  assertEquals(calls[1].form?.get("media_id"), "media1");
  assertEquals(calls[2].form?.get("command"), "FINALIZE");

  const tweetBody = JSON.parse(calls[3].body!);
  assertEquals(tweetBody.media, { media_ids: ["media1"] });
});

Deno.test("tweet-create: polls STATUS when FINALIZE reports pending processing", async () => {
  const { ctx, calls } = mockCtx([
    { body: { data: { id: "media1" } } }, // INIT
    { body: { data: { id: "media1" } } }, // APPEND
    {
      body: { data: { id: "media1", processing_info: { state: "pending", check_after_secs: 0 } } },
    }, // FINALIZE
    { body: { data: { id: "media1", processing_info: { state: "succeeded" } } } }, // STATUS
    { body: { data: { id: "1", text: "" } } }, // POST /tweets
  ]);
  await action.execute({ media: "data:image/gif;base64,AAAA", mediaCategory: "tweet_gif" }, ctx);
  assertEquals(calls.length, 5);
  assertEquals(calls[3].url, "https://api.x.com/2/media/upload?command=STATUS&media_id=media1");
});

Deno.test("tweet-create: throws without text or media", async () => {
  const { ctx } = mockCtx();
  await assertRejects(
    async () => {
      await action.execute({}, ctx);
    },
    Error,
    "needs",
  );
});

Deno.test("tweet-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
