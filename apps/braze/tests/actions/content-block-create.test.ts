import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/content-block-create.ts";

test("content-block-create: posts name, content, state and tags", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { content_block_id: "cb1" } }], {
    display: { instance: "iad-01" },
  });
  await action.execute!({
    name: "footer",
    content: "<p>bye</p>",
    state: "draft",
    tags: ["marketing"],
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, {
    name: "footer",
    content: "<p>bye</p>",
    state: "draft",
    tags: ["marketing"],
  });
});
