import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/story-publish.ts";

const M = { display: { credentialKind: "management", region: "eu", spaceId: "123" } };
const story = (extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { story: { full_slug: "blog/post", published: false, ...extra } },
});
const ok = { status: 200, body: {} };

/** Storyblok publishes with a GET, which is unusual enough to assert. */
Deno.test("story-publish: publishes through the publish endpoint", async () => {
  const { ctx, calls } = mockCtx([story(), ok], M);
  const result = await action.execute({ storyId: "9" }, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[1].url).pathname, "/v1/spaces/123/stories/9/publish");
  assertEquals(calls[1].method, "GET");
  assertEquals(result.published, true);
  assertEquals(result.changed, true);
});

Deno.test("story-publish: unpublishing hits the other endpoint", async () => {
  const { ctx, calls } = mockCtx([story({ published: true }), ok], M);
  const result = await action.execute({ storyId: "9", published: false }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[1].url).pathname, "/v1/spaces/123/stories/9/unpublish");
  assertEquals(result.published, false);
});

/** Publishing puts whatever is in the draft live, including somebody else's. */
Deno.test("story-publish: says when unpublished changes go live with it", async () => {
  const { ctx, logs } = mockCtx([story({ published: true, unpublished_changes: true }), ok], M);
  const result = await action.execute({ storyId: "9" }, ctx) as Record<string, unknown>;
  assertEquals(result.hadUnpublishedChanges, true);
  assert(
    logs.some((l) => /somebody's draft edits live/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** The parameter is ignored unless the space enables per-language publishing. */
Deno.test("story-publish: language publishing is passed through with a caveat", async () => {
  const { ctx, calls, logs } = mockCtx([story(), ok], M);
  const result = await action.execute({ storyId: "9", languages: "de, fr" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(new URL(calls[1].url).searchParams.get("lang"), "de,fr");
  assertEquals(result.languages, ["de", "fr"]);
  assert(
    logs.some((l) => /publishes everything/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("story-publish: requires a story id", async () => {
  const { ctx, calls } = mockCtx([], M);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`storyId` is required");
  assertEquals(calls.length, 0);
});
