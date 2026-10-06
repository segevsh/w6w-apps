import { assertEquals } from "@std/assert";
import moderationCreate from "../../actions/moderation-create.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

const result = {
  id: "m1",
  model: "omni-moderation-latest",
  results: [{ flagged: true, categories: { violence: true }, category_scores: { violence: 0.9 } }],
  cost: 0,
  provider: "openai",
};

Deno.test("moderation-create: defaults the model and flattens the first result", async () => {
  const { ctx, calls } = mockCtx([{ body: result }]);
  const out = await moderationCreate.execute({ input: "bad text" }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v3/moderations");
  assertEquals(bodyOf(calls[0]), { input: "bad text", model: "openai/omni-moderation-latest" });
  assertEquals(out.flagged, true);
  assertEquals(out.categories, { violence: true });
  assertEquals(out.categoryScores, { violence: 0.9 });
});

Deno.test("moderation-create: an empty results list is not flagged", async () => {
  const { ctx } = mockCtx([{ body: { id: "m", model: "x", results: [] } }]);
  const out = await moderationCreate.execute({ input: "t", model: "openai/x" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(out.flagged, false);
});
