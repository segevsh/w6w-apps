import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/story-update.ts";

const M = { display: { credentialKind: "management", region: "eu", spaceId: "123" } };
const existing = {
  status: 200,
  body: {
    story: {
      name: "Old",
      slug: "old-post",
      full_slug: "blog/old-post",
      content: { component: "article", title: "Old", body: [], author: "ada" },
    },
  },
};
const updated = { status: 200, body: { story: { id: 9, full_slug: "blog/old-post" } } };

/** Storyblok replaces content; a two-field payload would leave a two-field story. */
Deno.test("story-update: merges over the existing content by default", async () => {
  const { ctx, calls } = mockCtx([existing, updated], M);
  const result = await action.execute(
    { storyId: "9", content: '{"component":"article","title":"New"}' },
    ctx,
  ) as Record<string, unknown>;

  const sent = JSON.parse(calls[1].body!) as { story: { content: Record<string, unknown> } };
  assertEquals(sent.story.content.title, "New");
  assertEquals(sent.story.content.author, "ada", "the untouched field survived");
  assertEquals(result.merged, true);
  assertEquals(result.removedFields, []);
});

Deno.test("story-update: replaceContent drops what the payload omits, and says which", async () => {
  const { ctx, calls, logs } = mockCtx([existing, updated], M);
  const result = await action.execute({
    storyId: "9",
    content: '{"component":"article","title":"New"}',
    replaceContent: true,
  }, ctx) as Record<string, unknown>;

  const sent = JSON.parse(calls[1].body!) as { story: { content: Record<string, unknown> } };
  assertEquals("author" in sent.story.content, false);
  assertEquals((result.removedFields as string[]).sort(), ["author", "body"]);
  assert(
    logs.some((l) => l.level === "warn" && /removed fields/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** Storyblok leaves no redirect behind. */
Deno.test("story-update: warns when the slug changes", async () => {
  const { ctx, logs } = mockCtx([existing, updated], M);
  const result = await action.execute({ storyId: "9", slug: "new-post" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(result.slugChanged, true);
  assert(
    logs.some((l) => l.level === "warn" && /does not leave a redirect/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("story-update: touches the draft unless publish is set", async () => {
  const draft = mockCtx([existing, updated], M);
  await action.execute({ storyId: "9", name: "New" }, draft.ctx);
  assertEquals((JSON.parse(draft.calls[1].body!) as { publish: number }).publish, 0);

  const live = mockCtx([existing, updated], M);
  await action.execute({ storyId: "9", name: "New", publish: true }, live.ctx);
  assertEquals((JSON.parse(live.calls[1].body!) as { publish: number }).publish, 1);
});

Deno.test("story-update: merged content is still shape-checked", async () => {
  const { ctx, calls } = mockCtx([existing], M);
  await assertRejects(
    async () =>
      await action.execute({
        storyId: "9",
        content: '{"component":"article","body":[{"component":"hero"}]}',
      }, ctx),
    Error,
    "_uid",
  );
  assertEquals(calls.length, 1, "it must not write");
});

Deno.test("story-update: an unknown story is refused", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }], M);
  await assertRejects(
    async () => await action.execute({ storyId: "9", name: "x" }, ctx),
    Error,
    "no story with id 9",
  );
});
