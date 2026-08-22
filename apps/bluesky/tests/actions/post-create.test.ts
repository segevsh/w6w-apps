import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok, POST_URI } from "./_shared.ts";
import action, { webUrl } from "../../actions/post-create.ts";

const created = ok({ uri: "at://did:plc:me/app.bsky.feed.post/3new", cid: "bafy" });
const resolved = ok({ did: "did:plc:alice" });

Deno.test("post-create: writes a post record to the connection's own repo", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  const result = await action.execute!({ text: "hello" }, ctx) as { uri: string; url: string };
  assertEquals(calls[0].url, "https://bsky.social/xrpc/com.atproto.repo.createRecord");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.repo, "did:plc:me");
  assertEquals(body.collection, "app.bsky.feed.post");
  assertEquals(body.record.text, "hello");
  assertEquals(body.record.$type, "app.bsky.feed.post");
  assert(body.record.createdAt, "no createdAt");
  assertEquals(result.url, "https://bsky.app/profile/did:plc:me/post/3new");
});

/**
 * Without facets a URL renders as plain grey text. Nothing errors, which is
 * why this is the app's central behaviour.
 */
Deno.test("post-create: a link becomes a real facet", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  const result = await action.execute!({ text: "see https://example.com" }, ctx) as {
    facetCount: number;
  };
  const facets = JSON.parse(calls[0].body!).record.facets;
  assertEquals(facets.length, 1);
  assertEquals(facets[0].features[0].$type, "app.bsky.richtext.facet#link");
  assertEquals(facets[0].features[0].uri, "https://example.com");
  assertEquals(result.facetCount, 1);
});

/** The offsets are UTF-8 bytes, so an emoji before the link shifts them. */
Deno.test("post-create: facet offsets are byte offsets, not string indices", async () => {
  const text = "👋 https://example.com";
  const { ctx, calls } = mockCtx([created], { display });
  await action.execute!({ text }, ctx);
  const facet = JSON.parse(calls[0].body!).record.facets[0];
  assertEquals(facet.index.byteStart, 5);
  assertEquals(text.indexOf("https"), 3, "the string index a naive build would have used");
});

Deno.test("post-create: a mention is resolved to a DID before the write", async () => {
  const { ctx, calls } = mockCtx([resolved, created], { display });
  await action.execute!({ text: "hi @alice.bsky.social" }, ctx);
  assert(calls[0].url.includes("resolveHandle"), calls[0].url);
  const facet = JSON.parse(calls[1].body!).record.facets[0];
  assertEquals(facet.features[0].$type, "app.bsky.richtext.facet#mention");
  assertEquals(facet.features[0].did, "did:plc:alice");
});

/** A deleted account should not break a scheduled post that mentioned them. */
Deno.test("post-create: an unresolvable mention is reported, not fatal", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: { error: "InvalidRequest", message: "Unable to resolve handle" } },
    created,
  ], { display });
  const result = await action.execute!({ text: "bye @gone.bsky.social" }, ctx) as {
    unresolvedMentions: string[];
    facetCount: number;
  };
  assertEquals(result.unresolvedMentions, ["gone.bsky.social"]);
  assertEquals(result.facetCount, 0);
});

Deno.test("post-create: detection can be turned off entirely", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  await action.execute!({ text: "see https://example.com", detectFacets: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).record.facets, undefined);
});

/** Mixing supplied and detected facets would produce overlaps, which the PDS rejects. */
Deno.test("post-create: supplied facets replace detection rather than merging", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  await action.execute!({
    text: "see https://example.com",
    facets: '[{"index":{"byteStart":0,"byteEnd":3},"features":[]}]',
  }, ctx);
  const facets = JSON.parse(calls[0].body!).record.facets;
  assertEquals(facets.length, 1);
  assertEquals(facets[0].index.byteEnd, 3);
});

/** Setting root to the parent detaches the reply into its own thread. */
Deno.test("post-create: a reply takes root from the parent's own thread root", async () => {
  const parent = ok({
    posts: [{
      uri: POST_URI,
      cid: "cid-parent",
      record: {
        reply: { root: { uri: "at://did:plc:x/app.bsky.feed.post/root", cid: "cid-root" } },
      },
    }],
  });
  const { ctx, calls } = mockCtx([parent, created], { display });
  await action.execute!({ text: "agreed", replyTo: POST_URI }, ctx);
  const reply = JSON.parse(calls[1].body!).record.reply;
  assertEquals(reply.parent, { uri: POST_URI, cid: "cid-parent" });
  assertEquals(reply.root.uri, "at://did:plc:x/app.bsky.feed.post/root");
});

Deno.test("post-create: replying to a top-level post makes it its own root", async () => {
  const parent = ok({ posts: [{ uri: POST_URI, cid: "cid-parent", record: {} }] });
  const { ctx, calls } = mockCtx([parent, created], { display });
  await action.execute!({ text: "agreed", replyTo: POST_URI }, ctx);
  const reply = JSON.parse(calls[1].body!).record.reply;
  assertEquals(reply.root, reply.parent);
});

Deno.test("post-create: a bsky.app link works wherever an AT-URI does", async () => {
  const parent = ok({ posts: [{ uri: POST_URI, cid: "cid-parent", record: {} }] });
  const { ctx, calls } = mockCtx([parent, created], { display });
  await action.execute!({
    text: "agreed",
    replyTo: "https://bsky.app/profile/author.bsky.social/post/3k2a",
  }, ctx);
  assert(calls[0].url.includes("uris=at%3A%2F%2Fauthor.bsky.social"), calls[0].url);
});

Deno.test("post-create: a quote builds the embed and needs the target's CID", async () => {
  const target = ok({ posts: [{ uri: POST_URI, cid: "cid-quoted" }] });
  const { ctx, calls } = mockCtx([target, created], { display });
  await action.execute!({ text: "look at this", quotePost: POST_URI }, ctx);
  assertEquals(JSON.parse(calls[1].body!).record.embed, {
    $type: "app.bsky.embed.record",
    record: { uri: POST_URI, cid: "cid-quoted" },
  });
});

Deno.test("post-create: a quote and a raw embed together are refused", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({ text: "x", quotePost: POST_URI, embed: '{"$type":"x"}' }, ctx),
    Error,
    "not both",
  );
});

/** Both limits are checked before anything is sent. */
Deno.test("post-create: an over-long post is refused before the write", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ text: "a".repeat(301) }, ctx),
    Error,
    "GRAPHEMES",
  );
  assertEquals(calls.length, 0);
});

Deno.test("post-create: languages are capped at three", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  await action.execute!({ text: "hi", langs: "en, fr, de, es" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).record.langs, ["en", "fr", "de"]);
});

Deno.test("post-create: empty text is allowed only with an embed", async () => {
  const bare = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ text: "  " }, bare.ctx),
    Error,
    "required",
  );

  const withEmbed = mockCtx([created], { display });
  await action.execute!(
    { text: "", embed: '{"$type":"app.bsky.embed.images","images":[]}' },
    withEmbed.ctx,
  );
  assertEquals(withEmbed.calls.length, 1);
});

/** A post is the caller's content. */
Deno.test("post-create: logs counts, never the text", async () => {
  const { ctx, logs } = mockCtx([created], { display });
  await action.execute!({ text: "a secret about tuna" }, ctx);
  assert(!JSON.stringify(logs).includes("tuna"), JSON.stringify(logs));
  assertEquals(logs[0].data, { facets: 0, unresolvedMentions: 0, reply: false });
});

Deno.test("post-create: webUrl only converts post URIs", () => {
  assertEquals(
    webUrl("at://did:plc:me/app.bsky.feed.post/3new"),
    "https://bsky.app/profile/did:plc:me/post/3new",
  );
  assertEquals(webUrl("at://did:plc:me/app.bsky.feed.like/3new"), undefined);
});

/** Each call makes a new record; there is no upsert. */
Deno.test("post-create: is declared non-idempotent", () => {
  assertEquals(action.idempotent, false);
  assert(/silently/.test(action.description!), action.description);
});
