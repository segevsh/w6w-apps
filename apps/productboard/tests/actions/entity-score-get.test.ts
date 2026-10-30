import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import action from "../../actions/entity-score-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

test("entity-score-get: GETs the score sub-path", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ score: 42 }) }]);
  const out = await action.execute({ entityId: "e-1" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/entities/e-1/score");
  assertEquals(out.data, { score: 42 });
});

/** The vendor marks this operation "(Beta)"; the label must survive into the UI. */
test("entity-score-get: the beta status is stated in the title and description", () => {
  assert(action.title.toLowerCase().includes("beta"), action.title);
  assert(action.description!.toLowerCase().includes("beta"), action.description!);
});
