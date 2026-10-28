import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-post.ts";

Deno.test("create-post: text post as a person, POSTs /rest/posts with the expected body", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, headers: { "x-restli-id": "urn:li:share:111" } },
  ]);
  const out = await action.execute!(
    { authorType: "person", authorId: "abc123", commentary: "Hello World" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/posts");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.author, "urn:li:person:abc123");
  assertEquals(body.commentary, "Hello World");
  assertEquals(body.visibility, "PUBLIC");
  assertEquals(body.lifecycleState, "PUBLISHED");
  assertEquals(body.distribution.feedDistribution, "MAIN_FEED");
  assertEquals(body.content, undefined);
  assertEquals((out as { id: string }).id, "urn:li:share:111");
});

Deno.test("create-post: escapes little-text reserved characters in commentary", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, headers: { "x-restli-id": "urn:li:share:1" } }]);
  await action.execute!(
    { authorType: "person", authorId: "abc123", commentary: "50% off! #sale" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.commentary, "50% off! \\#sale");
});

Deno.test("create-post: organization author builds an organization URN", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, headers: { "x-restli-id": "urn:li:share:2" } }]);
  await action.execute!(
    { authorType: "organization", authorId: "5515715", commentary: "Org post" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.author, "urn:li:organization:5515715");
});

Deno.test("create-post: article content type sends content.article", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, headers: { "x-restli-id": "urn:li:share:3" } }]);
  await action.execute!(
    {
      authorType: "person",
      authorId: "abc123",
      commentary: "Check this out",
      contentType: "article",
      articleUrl: "https://example.com/post",
      articleTitle: "Example",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.content.article.source, "https://example.com/post");
  assertEquals(body.content.article.title, "Example");
});

Deno.test("create-post: article content type without articleUrl throws", async () => {
  const { ctx } = mockCtx([]);
  let threw = false;
  try {
    await action.execute!(
      { authorType: "person", authorId: "abc123", commentary: "x", contentType: "article" },
      ctx,
    );
  } catch {
    threw = true;
  }
  assertEquals(threw, true);
});
