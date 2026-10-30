import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/document-create-paragraph-bullets.ts";

test("document-create-paragraph-bullets: emits createParagraphBullets with range + preset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({
    documentURL: "d-1",
    bulletPreset: "BULLET_CHECKBOX",
    startIndex: 1,
    endIndex: 42,
  }, ctx);
  assertEquals(JSON.parse(calls[0].body ?? "{}"), {
    requests: [{
      createParagraphBullets: {
        bulletPreset: "BULLET_CHECKBOX",
        range: { segmentId: "", startIndex: 1, endIndex: 42 },
      },
    }],
  });
});
