import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/block-get-many.ts";

test("block-get-many: GETs the form's raw block layout", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "f1", name: "Signup", blocks: [{ uuid: "b1" }, { uuid: "b2" }] } },
  ]);
  const result = await action.execute({ formId: "f1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/forms/f1/blocks");
  assertEquals(result.name, "Signup");
  assertEquals(result.count, 2);
});

test("block-get-many: tolerates a body without a blocks array", async () => {
  const { ctx } = mockCtx([{ body: { id: "f1" } }]);
  const result = await action.execute({ formId: "f1" }, ctx);
  assertEquals(result.blocks, []);
  assertEquals(result.count, 0);
});
