import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import windowScroll from "../../actions/window-scroll.ts";
import { aiEnvelope, mockCtx, pathOf } from "../_helpers.ts";

test("window-scroll: scrollToElement is sent alone when only it is provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: aiEnvelope("Scrolled.") }]);
  await windowScroll.execute(
    { sessionId: "s1", windowId: "w1", scrollToElement: "the footer" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/api/v1/sessions/s1/windows/w1/scroll");
  assertEquals(JSON.parse(calls[0].body!), { scrollToElement: "the footer" });
});

test("window-scroll: scrollToEdge and scrollBy are nested objects, omitted when both axes are empty", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: aiEnvelope("Scrolled.") }]);
  await windowScroll.execute(
    { sessionId: "s1", windowId: "w1", scrollToEdgeY: "top", scrollByX: "10%" },
    ctx,
  );

  assertEquals(JSON.parse(calls[0].body!), {
    scrollToEdge: { yAxis: "top" },
    scrollBy: { xAxis: "10%" },
  });
});
