import { assert, assertEquals } from "@std/assert";
import { jsonBody, mockCtx } from "../_helpers.ts";
import action from "../../actions/block-update-many.ts";

Deno.test("block-update-many: PATCHes the whole block array and warns about it", async () => {
  const blocks = [{ uuid: "b1", type: "INPUT_TEXT" }];
  const { ctx, calls, logs } = mockCtx([{ body: { uuid: "b1" } }]);
  const result = await action.execute({ formId: "f1", blocks }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/forms/f1/blocks");
  assertEquals(jsonBody(calls[0]), { blocks });
  assertEquals(result.formId, "f1");
  assertEquals(logs[0].level, "warn");
  assert(logs[0].message.includes("omitted blocks are deleted"));
});

Deno.test("block-update-many: forwards settings when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "f1", blocks: [], settings: { isClosed: true } }, ctx);
  assertEquals(jsonBody(calls[0]), { blocks: [], settings: { isClosed: true } });
});
