import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import transcriptList from "../../actions/transcript-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = {
  page_details: {
    limit: 10,
    result_count: 1,
    current_url: "https://api.assemblyai.com/v2/transcript?limit=10",
    prev_url: null,
    next_url: null,
  },
  transcripts: [{ id: "t1", status: "completed" }],
};

test("transcript-list: GETs /v2/transcript with the filter query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: PAGE }]);
  const out = await transcriptList.execute(
    { limit: 5, status: "completed", beforeId: "t9" },
    ctx,
  ) as { transcripts: unknown[] };
  assertEquals(pathOf(calls[0].url), "/v2/transcript");
  const q = queryOf(calls[0].url);
  assertEquals(q.limit, "5");
  assertEquals(q.status, "completed");
  assertEquals(q.before_id, "t9");
  assertEquals("after_id" in q, false);
  assertEquals(out.transcripts.length, 1);
});

test("transcript-list: is a search action", () => {
  assertEquals(transcriptList.type, "search");
});
