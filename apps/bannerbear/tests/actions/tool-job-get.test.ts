import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import toolJobGet from "../../actions/tool-job-get.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

test("tool-job-get: GET /tool_jobs/{uid}", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        uid: "j1",
        tool: "remove_bg",
        status: "completed",
        outputs: { image_url: "https://x" },
      },
    },
  ]);
  const out = await toolJobGet.execute({ uid: "j1" }, ctx) as unknown as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/tool_jobs/j1");
  assertEquals(out.status, "completed");
});

test("tool-job-get: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => toolJobGet.execute({ uid: "" }, ctx));
});
