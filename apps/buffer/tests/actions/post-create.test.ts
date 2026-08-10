import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { data, gqlOf, mockCtx, optionValues, param } from "../_helpers.ts";
import postCreate from "../../actions/post-create.ts";

const ok = () => data({ createPost: { __typename: "PostActionSuccess", post: { id: "p1" } } });

function input(calls: { body: string | null }[]): Record<string, unknown> {
  return (gqlOf(calls[0] as never).variables as { input: Record<string, unknown> }).input;
}

Deno.test("post-create: the minimum call matches Buffer's own example", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await postCreate.execute({ channelId: "c1", text: "Hello", mode: "addToQueue" }, ctx);
  assertEquals(input(calls), {
    channelId: "c1",
    text: "Hello",
    mode: "addToQueue",
    schedulingType: "automatic",
  });
});

Deno.test("post-create: schedulingType defaults to automatic when left blank", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await postCreate.execute({ channelId: "c1", mode: "shareNow", schedulingType: "" }, ctx);
  assertEquals(input(calls).schedulingType, "automatic");
});

Deno.test("post-create: customScheduled carries dueAt through", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await postCreate.execute({
    channelId: "c1",
    text: "x",
    mode: "customScheduled",
    dueAt: "2026-03-10T15:00:00.000Z",
  }, ctx);
  assertEquals(input(calls).mode, "customScheduled");
  assertEquals(input(calls).dueAt, "2026-03-10T15:00:00.000Z");
});

Deno.test("post-create: the mode options are Buffer's four", () => {
  assertEquals(optionValues(postCreate, "mode"), [
    "addToQueue",
    "shareNow",
    "shareNext",
    "customScheduled",
  ]);
  assertEquals(param(postCreate, "mode").default, "addToQueue");
  assertEquals(param(postCreate, "mode").required, true);
});

Deno.test("post-create: dueAt and mode each name the other, because the trap is silent", () => {
  assert(/Custom scheduled time/.test(String(param(postCreate, "dueAt").hint)));
  assert(/Scheduled for/.test(String(param(postCreate, "mode").hint)));
});

Deno.test("post-create: booleans are omitted unless set — needsApproval especially", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await postCreate.execute({ channelId: "c1", mode: "addToQueue" }, ctx);
  assertEquals("needsApproval" in input(calls), false);
  assertEquals("saveToDraft" in input(calls), false);
});

Deno.test("post-create: an explicit false for saveToDraft still goes out", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await postCreate.execute({ channelId: "c1", mode: "addToQueue", saveToDraft: false }, ctx);
  assertEquals(input(calls).saveToDraft, false);
});

Deno.test("post-create: image URLs become one asset each, in order", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await postCreate.execute({
    channelId: "c1",
    mode: "addToQueue",
    imageUrls: "https://x/a.png,https://x/b.png",
  }, ctx);
  assertEquals(input(calls).assets, [
    { image: { url: "https://x/a.png" } },
    { image: { url: "https://x/b.png" } },
  ]);
});

Deno.test("post-create: no assets key at all when none are supplied", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await postCreate.execute({ channelId: "c1", mode: "addToQueue" }, ctx);
  assertEquals("assets" in input(calls), false);
});

Deno.test("post-create: network metadata is passed through unchanged", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await postCreate.execute({
    channelId: "c1",
    mode: "addToQueue",
    metadata: { linkedin: { firstComment: "More here →" } },
  }, ctx);
  assertEquals(input(calls).metadata, { linkedin: { firstComment: "More here →" } });
});

Deno.test("post-create: bad metadata JSON fails loudly, before any request", () => {
  const { ctx, calls } = mockCtx([]);
  // Throws synchronously — the parse happens while the mutation variables are
  // being built, so nothing reaches the network.
  assertThrows(
    () => postCreate.execute({ channelId: "c1", mode: "addToQueue", metadata: "{oops" }, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("post-create: tag ids split on commas", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await postCreate.execute({ channelId: "c1", mode: "addToQueue", tagIds: "t1, t2" }, ctx);
  assertEquals(input(calls).tagIds, ["t1", "t2"]);
});

/* -------- the 200-that-means-failure arm -------- */

Deno.test("post-create: a success arm returns the post", async () => {
  const { ctx } = mockCtx([ok()]);
  const out = await postCreate.execute({ channelId: "c1", mode: "addToQueue" }, ctx);
  assertEquals((out as { post: { id: string } }).post.id, "p1");
});

Deno.test("post-create: an InvalidInputError arrives 200 and still throws", async () => {
  const { ctx } = mockCtx([
    data({ createPost: { __typename: "InvalidInputError", message: "Text is required" } }),
  ]);
  const err = await assertRejects(
    () => Promise.resolve(postCreate.execute({ channelId: "c1", mode: "addToQueue" }, ctx)),
    Error,
  );
  assert(/Text is required/.test(err.message), err.message);
});

Deno.test("post-create: LimitReachedError — the daily cap — is a failure, not a result", async () => {
  const { ctx } = mockCtx([
    data({
      createPost: { __typename: "LimitReachedError", message: "Daily posting limit reached" },
    }),
  ]);
  const err = await assertRejects(
    () => Promise.resolve(postCreate.execute({ channelId: "c1", mode: "addToQueue" }, ctx)),
    Error,
  );
  assert(/Daily posting limit/.test(err.message), err.message);
});

Deno.test("post-create: RestProxyError names the network's own rejection", async () => {
  const { ctx } = mockCtx([
    data({
      createPost: {
        __typename: "RestProxyError",
        message: "Instagram rejected the media",
        link: "https://support.buffer.com/article/1",
        code: "IG_MEDIA",
      },
    }),
  ]);
  const err = await assertRejects(
    () => Promise.resolve(postCreate.execute({ channelId: "c1", mode: "addToQueue" }, ctx)),
    Error,
  );
  assert(/Instagram rejected the media/.test(err.message), err.message);
  assert(/RestProxyError/.test(err.message), err.message);
});

Deno.test("post-create: the mutation asks for __typename and the MutationError tail", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await postCreate.execute({ channelId: "c1", mode: "addToQueue" }, ctx);
  const { query } = gqlOf(calls[0]);
  assert(/__typename/.test(query), query);
  assert(/\.\.\. on MutationError \{ message \}/.test(query), query);
  assert(/\.\.\. on PostActionSuccess/.test(query), query);
});

Deno.test("post-create: is not idempotent — every call mints a new post", () => {
  assertEquals(postCreate.idempotent, false);
  assertEquals(postCreate.type, "perform");
});
