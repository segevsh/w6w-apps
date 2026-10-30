import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import textList from "../../actions/text-list.ts";
import { listEnvelope, mockCtx, pathOf } from "../_helpers.ts";

test("text-list: hits GET /v2.1/texts", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: 1 }]) }]);
  await textList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2.1/texts");
});
