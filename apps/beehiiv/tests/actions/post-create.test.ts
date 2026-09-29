import { assert, assertEquals, assertRejects } from "@std/assert";
import postCreate from "../../actions/post-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("post-create: POSTs to /publications/:id/posts with a compacted body", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { data: { id: "post_1", preview_url: "https://x/preview" } },
  }]);

  const out = await postCreate.execute({
    publicationId: "pub_1",
    title: "Launch",
    bodyContent: "<p>hi</p>",
    status: "draft",
    contentTags: "a,b",
    utmSource: "workflow",
    emailSettings: { email_subject_line: "Hi" },
  }, ctx) as { id: string };

  assertEquals(calls[0].url, "https://api.beehiiv.com/v2/publications/pub_1/posts");
  assertEquals(calls[0].method, "POST");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.title, "Launch");
  assertEquals(sent.body_content, "<p>hi</p>");
  assertEquals(sent.status, "draft");
  assertEquals(sent.content_tags, ["a", "b"]);
  assertEquals(sent.utm_source, "workflow");
  assertEquals(sent.email_settings, { email_subject_line: "Hi" });
  assert(!("subtitle" in sent), "unset fields must not be sent");
  assertEquals(out.id, "post_1");
});

Deno.test("post-create: rejects bodyContent and blocks provided together, before any fetch", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    () =>
      Promise.resolve(postCreate.execute(
        { publicationId: "pub_1", title: "Launch", bodyContent: "<p>hi</p>", blocks: [{}] },
        ctx,
      )),
    Error,
    "bodyContent OR blocks",
  );
  assertEquals(calls.length, 0);
});

Deno.test("post-create: accepts a JSON-string blocks param via asOptionalJson", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "post_1" } } }]);
  await postCreate.execute({
    publicationId: "pub_1",
    title: "Launch",
    blocks: '[{"type":"paragraph"}]',
  }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.blocks, [{ type: "paragraph" }]);
});

Deno.test("post-create: is a non-idempotent perform action", () => {
  assertEquals(postCreate.type, "perform");
  assertEquals(postCreate.idempotent, false);
});
