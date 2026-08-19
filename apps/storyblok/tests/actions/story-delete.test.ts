import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/story-delete.ts";

const M = { display: { credentialKind: "management", region: "eu", spaceId: "123" } };
const story = (extra: Record<string, unknown> = {}) => ({
  status: 200,
  body: { story: { full_slug: "blog/post", uuid: "u9", published: true, ...extra } },
});
const ok = { status: 200, body: {} };

Deno.test("story-delete: deletes after confirmation and records what it was", async () => {
  const { ctx, calls } = mockCtx([story(), ok], M);
  const result = await action.execute({ storyId: "9", confirm: true }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(calls[1].method, "DELETE");
  assertEquals(new URL(calls[1].url).pathname, "/v1/spaces/123/stories/9");
  assertEquals(result.uuid, "u9");
  assertEquals(result.wasPublished, true);
});

/** A folder deletion is a bulk deletion wearing a single-item interface. */
Deno.test("story-delete: refuses a folder without an acknowledgement", async () => {
  const { ctx, calls } = mockCtx([story({ is_folder: true })], M);
  const err = await assertRejects(
    async () => await action.execute({ storyId: "9", confirm: true }, ctx),
    Error,
  );
  assert(/removes every story inside it/.test(err.message), err.message);
  assertEquals(calls.length, 1, "it must not delete");
});

Deno.test("story-delete: allowFolder lets it through", async () => {
  const { ctx } = mockCtx([story({ is_folder: true }), ok], M);
  const result = await action.execute(
    { storyId: "9", confirm: true, allowFolder: true },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(result.wasFolder, true);
  assertEquals(result.deleted, true);
});

Deno.test("story-delete: refuses without confirmation, and names unpublishing", async () => {
  const { ctx, calls } = mockCtx([], M);
  const err = await assertRejects(
    async () => await action.execute({ storyId: "9" }, ctx),
    Error,
  );
  assert(/reversible way to take a page down/.test(err.message), err.message);
  assertEquals(calls.length, 0);
});

/** References are uuids, so a deleted story leaves an empty block behind. */
Deno.test("story-delete: warns about the dangling references", async () => {
  const { ctx, logs } = mockCtx([story(), ok], M);
  await action.execute({ storyId: "9", confirm: true }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /renders as an empty block/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("story-delete: is not idempotent", () => {
  assertEquals(action.idempotent, false);
});
