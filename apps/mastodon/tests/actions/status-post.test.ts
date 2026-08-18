import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action, { countCharacters } from "../../actions/status-post.ts";

const posted = ok({ id: "s1", url: "https://mastodon.social/@alice/s1" });

Deno.test("status-post: posts and reports the length against the instance's limit", async () => {
  const { ctx, calls } = mockCtx([posted], { display });
  const result = await action.execute!({ status: "hello" }, ctx) as {
    id: string;
    characters: number;
    limit: number;
  };
  assertEquals(calls[0].url, "https://mastodon.social/api/v1/statuses");
  assertEquals(JSON.parse(calls[0].body!).status, "hello");
  assertEquals(result.characters, 5);
  assertEquals(result.limit, 500);
});

/** The limit is the instance's, not Mastodon's. */
Deno.test("status-post: an instance with a higher limit accepts a longer post", async () => {
  const long = "a".repeat(1000);
  const refused = mockCtx([], { display });
  const error = await assertRejects(
    async () => await action.execute!({ status: long }, refused.ctx),
    Error,
  );
  assert(/this instance allows 500/.test(error.message), error.message);
  assert(/That limit is\s+the SERVER'S/.test(error.message), error.message);
  assertEquals(refused.calls.length, 0);

  const generous = mockCtx([posted], { display: { ...display, maxCharacters: 5000 } });
  await action.execute!({ status: long }, generous.ctx);
  assertEquals(generous.calls.length, 1);
});

/** A fresh key would let a retry post twice; a derived one deduplicates. */
Deno.test("status-post: the idempotency key is derived, so a retry deduplicates", async () => {
  const first = mockCtx([posted], { display });
  await action.execute!({ status: "hello" }, first.ctx);
  const second = mockCtx([posted], { display });
  await action.execute!({ status: "hello" }, second.ctx);

  const a = first.calls[0].headers["idempotency-key"];
  const b = second.calls[0].headers["idempotency-key"];
  assert(a, "no idempotency key was sent");
  assertEquals(a, b, "a retry would post twice");
});

Deno.test("status-post: a different post gets a different key", async () => {
  const one = mockCtx([posted], { display });
  await action.execute!({ status: "hello" }, one.ctx);
  const two = mockCtx([posted], { display });
  await action.execute!({ status: "goodbye" }, two.ctx);
  assert(
    one.calls[0].headers["idempotency-key"] !== two.calls[0].headers["idempotency-key"],
    "two different posts shared a key",
  );
});

/** URLs are 23 characters however long, and a mention costs only the username. */
Deno.test("status-post: counts the way Mastodon counts", () => {
  assertEquals(countCharacters("hello"), 5);
  assertEquals(countCharacters("https://example.com/a/very/long/path/indeed/xxxxx"), 23);
  assertEquals(countCharacters("@alice@example.social"), 6);
  assertEquals(countCharacters("hi @bob@long.instance.example.com"), 3 + 4);
});

Deno.test("status-post: a post of URLs fits where a naive count would refuse it", async () => {
  const text = Array.from({ length: 20 }, () => "https://example.com/a/long/path/here").join(" ");
  assert(text.length > 500, "the raw string is over the limit");
  const { ctx, calls } = mockCtx([posted], { display });
  await action.execute!({ status: text }, ctx);
  assertEquals(calls.length, 1, "Mastodon would have accepted this");
});

Deno.test("status-post: visibility, reply and warning reach the wire", async () => {
  const { ctx, calls } = mockCtx([posted], { display });
  await action.execute!({
    status: "hi",
    visibility: "unlisted",
    inReplyToId: "s0",
    spoilerText: "spoilers",
    sensitive: true,
    language: "en",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.visibility, "unlisted");
  assertEquals(body.in_reply_to_id, "s0");
  assertEquals(body.spoiler_text, "spoilers");
  assertEquals(body.sensitive, true);
  assertEquals(body.language, "en");
});

/** A scheduled post returns a schedule id, not a status id. */
Deno.test("status-post: scheduling is flagged, because the id means something else", async () => {
  const { ctx } = mockCtx([ok({ id: "sched1", scheduled_at: "2026-09-01T10:00:00Z" })], {
    display,
  });
  const result = await action.execute!({
    status: "later",
    scheduledAt: "2026-09-01T10:00:00Z",
  }, ctx) as { scheduled: boolean; id: string };
  assertEquals(result.scheduled, true);
  assertEquals(result.id, "sched1");
});

Deno.test("status-post: media alone is enough, text alone is enough, neither is not", async () => {
  const withMedia = mockCtx([posted], { display });
  await action.execute!({ status: "", mediaIds: "m1" }, withMedia.ctx);
  assertEquals(JSON.parse(withMedia.calls[0].body!).media_ids, ["m1"]);

  const empty = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ status: "  " }, empty.ctx),
    Error,
    "required",
  );
});

/** A post is the caller's content. */
Deno.test("status-post: logs counts, never the text", async () => {
  const { ctx, logs } = mockCtx([posted], { display });
  await action.execute!({ status: "a secret about tuna" }, ctx);
  assert(!JSON.stringify(logs).includes("tuna"), JSON.stringify(logs));
  assertEquals(logs[0].data, {
    characters: 19,
    limit: 500,
    scheduled: false,
    visibility: "public",
  });
});

/** `direct` is not a DM system. */
Deno.test("status-post: the visibility hint says what direct actually is", () => {
  const visibility = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "visibility")!;
  assert(/not a DM system/.test(visibility.hint!), visibility.hint);
});
