import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import templateList from "../../actions/template-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

test("template-list: returns items plus pagination cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: listEnvelope([{ id: "tpl_1", name: "Quarterly Update" }]),
  }]);
  const out = await templateList.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/templates");
  assertEquals(out, {
    items: [{ id: "tpl_1", name: "Quarterly Update" }],
    hasMore: false,
    nextToken: null,
  });
});
