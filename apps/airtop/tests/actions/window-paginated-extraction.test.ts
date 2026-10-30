import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import windowPaginatedExtraction from "../../actions/window-paginated-extraction.ts";
import { aiEnvelope, mockCtx, pathOf } from "../_helpers.ts";

test("window-paginated-extraction: prompt is required; interaction/pagination modes nest under configuration", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: aiEnvelope('{"items":[]}') }]);
  await windowPaginatedExtraction.execute(
    {
      sessionId: "s1",
      windowId: "w1",
      prompt: "Extract all product names across 3 pages.",
      interactionMode: "accurate",
      paginationMode: "paginated",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1/windows/w1/paginated-extraction");
  assertEquals(JSON.parse(calls[0].body!), {
    prompt: "Extract all product names across 3 pages.",
    configuration: { interactionMode: "accurate", paginationMode: "paginated" },
  });
});

test("window-paginated-extraction: prompt is a required param", () => {
  const promptParam = windowPaginatedExtraction.params?.find((p) => p.key === "prompt");
  assertEquals(promptParam?.required, true);
});
