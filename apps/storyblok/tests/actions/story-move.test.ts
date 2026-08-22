import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/story-move.ts";

const M = { display: { credentialKind: "management", region: "eu", spaceId: "123" } };
const story = (extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: {
    story: { full_slug: "about", uuid: "u9", parent_id: null, published: true, ...extra },
  },
});
const moved = { status: 200, body: { story: { full_slug: "company/about" } } };

/** Moving a story is a URL change wearing bookkeeping clothes. */
Deno.test("story-move: sets the parent and reports both paths", async () => {
  const { ctx, calls } = mockCtx([story(), moved], M);
  const result = await action.execute({ storyId: "9", parentId: "5" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[1].method, "PUT");
  assertEquals(JSON.parse(calls[1].body!), { story: { parent_id: 5 } });
  assertEquals(result.previousSlug, "about");
  assertEquals(result.slug, "company/about");
  assertEquals(result.uuid, "u9", "references survive");
});

Deno.test("story-move: warns that no redirect is left behind, and that it is live", async () => {
  const { ctx, logs } = mockCtx([story(), moved], M);
  await action.execute({ storyId: "9", parentId: "5" }, ctx);
  const warning = logs.find((l) => l.level === "warn")!;
  assert(/leaves no redirect/.test(warning.message), warning.message);
  assert(/that is live now/.test(warning.message), warning.message);
});

Deno.test("story-move: an empty parent moves the story to the root", async () => {
  const { ctx, calls } = mockCtx([story({ parent_id: 5 }), moved], M);
  await action.execute({ storyId: "9" }, ctx);
  assertEquals(JSON.parse(calls[1].body!), { story: { parent_id: null } });
});

/** Moving a story to where it already is should not be a URL change. */
Deno.test("story-move: a no-op move writes nothing", async () => {
  const { ctx, calls } = mockCtx([story({ parent_id: 5 })], M);
  const result = await action.execute({ storyId: "9", parentId: "5" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.changed, false);
  assertEquals(calls.length, 1);
});

Deno.test("story-move: requires a story id", async () => {
  const { ctx } = mockCtx([], M);
  await assertRejects(async () => await action.execute({}, ctx), Error, "`storyId` is required");
});
