import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { data, gqlOf, mockCtx, param } from "../_helpers.ts";
import ideaCreate from "../../actions/idea-create.ts";

const ok = () => data({ createIdea: { __typename: "Idea", id: "i1" } });

function input(calls: { body: string | null }[]): Record<string, unknown> {
  return (gqlOf(calls[0] as never).variables as { input: Record<string, unknown> }).input;
}

Deno.test("idea-create: content is nested under `content`, matching Buffer's example", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await ideaCreate.execute({ organizationId: "o1", title: "T", text: "B" }, ctx);
  assertEquals(input(calls), {
    organizationId: "o1",
    content: { title: "T", text: "B" },
  });
});

Deno.test("idea-create: an idea with no content at all fails before the request", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => ideaCreate.execute({ organizationId: "o1" }, ctx),
    Error,
    "at least a title or some text",
  );
  assertEquals(calls.length, 0);
});

Deno.test("idea-create: services are an annotation array, not a channel", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await ideaCreate.execute(
    { organizationId: "o1", text: "x", services: ["linkedin", "bluesky"] },
    ctx,
  );
  assertEquals(
    (input(calls).content as { services: string[] }).services,
    ["linkedin", "bluesky"],
  );
});

Deno.test("idea-create: group placement is nested under `group`", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await ideaCreate.execute(
    { organizationId: "o1", text: "x", groupId: "g1", placeAfterId: "i9" },
    ctx,
  );
  assertEquals(input(calls).group, { groupId: "g1", placeAfterId: "i9" });
});

Deno.test("idea-create: no group key when neither placement field is set", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await ideaCreate.execute({ organizationId: "o1", text: "x" }, ctx);
  assertEquals("group" in input(calls), false);
});

Deno.test("idea-create: media passes through as a raw array", async () => {
  const { ctx, calls } = mockCtx([ok()]);
  await ideaCreate.execute({
    organizationId: "o1",
    text: "x",
    media: '[{"url":"https://x/a.png","type":"image"}]',
  }, ctx);
  assertEquals(
    (input(calls).content as { media: unknown[] }).media,
    [{ url: "https://x/a.png", type: "image" }],
  );
});

Deno.test("idea-create: the media hint records that Buffer says `video` does not work", () => {
  assert(/not supported via the public API/i.test(String(param(ideaCreate, "media").hint)));
});

Deno.test("idea-create: the tags hint records that all three TagInput fields are required", () => {
  const hint = String(param(ideaCreate, "tags").hint);
  assert(/id, name and colour/i.test(hint), hint);
});

Deno.test("idea-create: a non-array media value is rejected", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => ideaCreate.execute({ organizationId: "o1", text: "x", media: '{"url":"x"}' }, ctx),
    Error,
    "must be a JSON array",
  );
});

Deno.test("idea-create: both success arms are accepted — Idea and IdeaResponse", async () => {
  const { ctx } = mockCtx([ok()]);
  const bare = await ideaCreate.execute({ organizationId: "o1", text: "x" }, ctx);
  assertEquals((bare as { id: string }).id, "i1");

  const { ctx: ctx2 } = mockCtx([
    data({ createIdea: { __typename: "IdeaResponse", refreshIdeas: true, idea: { id: "i2" } } }),
  ]);
  const wrapped = await ideaCreate.execute({ organizationId: "o1", text: "x" }, ctx2);
  assertEquals((wrapped as { idea: { id: string } }).idea.id, "i2");
});

Deno.test("idea-create: an error arm throws even though Buffer's own example omits one", async () => {
  const { ctx } = mockCtx([
    data({ createIdea: { __typename: "LimitReachedError", message: "Idea limit reached" } }),
  ]);
  const err = await assertRejects(
    () => Promise.resolve(ideaCreate.execute({ organizationId: "o1", text: "x" }, ctx)),
    Error,
  );
  assert(/Idea limit reached/.test(err.message), err.message);
});

Deno.test("idea-create: not idempotent", () => {
  assertEquals(ideaCreate.idempotent, false);
});
