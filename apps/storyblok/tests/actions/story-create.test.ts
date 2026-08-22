import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/story-create.ts";

const M = { display: { credentialKind: "management", region: "eu", spaceId: "123" } };
const created = {
  status: 200,
  body: { story: { id: 9, uuid: "u9", full_slug: "blog/new-post" } },
};
const content = '{"component":"article","title":"New"}';

Deno.test("story-create: posts the story and leaves it unpublished by default", async () => {
  const { ctx, calls } = mockCtx([created], M);
  const result = await action.execute({ name: "New", slug: "new-post", content }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/123/stories");
  const body = JSON.parse(calls[0].body!) as Record<string, never>;
  assertEquals(body.publish, 0);
  assertEquals(result.id, 9);
  assertEquals(result.contentType, "article");
});

Deno.test("story-create: publish and parent folder reach the body", async () => {
  const { ctx, calls } = mockCtx([created], M);
  await action.execute(
    { name: "New", slug: "new-post", content, publish: true, parentId: "5" },
    ctx,
  );
  const body = JSON.parse(calls[0].body!) as { publish: number; story: { parent_id: number } };
  assertEquals(body.publish, 1);
  assertEquals(body.story.parent_id, 5);
});

/**
 * The rule Storyblok's own error does not name: a nested component without a
 * `_uid` can import cleanly and render as an empty block.
 */
Deno.test("story-create: validates the content shape before sending", async () => {
  const { ctx, calls } = mockCtx([], M);
  const err = await assertRejects(
    async () =>
      await action.execute({
        name: "New",
        slug: "new-post",
        content: '{"component":"article","body":[{"component":"hero"}]}',
      }, ctx),
    Error,
  );
  assert(/no `_uid`/.test(err.message), err.message);
  assert(/render as an empty block/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

Deno.test("story-create: a slug is required, and says why", async () => {
  const { ctx } = mockCtx([], M);
  const err = await assertRejects(
    async () => await action.execute({ name: "New", content }, ctx),
    Error,
  );
  assert(/does not derive one from the name/.test(err.message), err.message);
});

Deno.test("story-create: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});

/** Ids and paths in the log, not the content. */
Deno.test("story-create: never logs the content", async () => {
  const { ctx, logs } = mockCtx([created], M);
  await action.execute({
    name: "New",
    slug: "new-post",
    content: '{"component":"article","secret":"hunter2"}',
  }, ctx);
  assert(!/hunter2/.test(JSON.stringify(logs)), JSON.stringify(logs));
});
