import { assertEquals } from "@std/assert";
import storyGet from "../../actions/story-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("story-get: calls GET /stories/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 123, name: "Fix the checkout bug" } }]);
  const out = await storyGet.execute({ storyId: 123 }, ctx) as { name: string };

  assertEquals(pathOf(calls[0].url), "/api/v3/stories/123");
  assertEquals(out.name, "Fix the checkout bug");
});
