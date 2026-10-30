import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx, sent } from "../_helpers.ts";
import action from "../../actions/transcript-get.ts";

const OK = { data: { transcript: { id: "t1", title: "Weekly sync" } } };

test("transcript-get: queries by id and includes the summary by default", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ transcriptId: "t1" }, ctx);
  const { query, variables } = sent(calls[0]);
  assert(query.includes("transcript(id: $transcriptId)"));
  assert(query.includes("summary {"));
  assertEquals(variables, { transcriptId: "t1" });
});

test("transcript-get: omits the paid-plan field groups unless asked", async () => {
  // `audio_url`, `video_url` and `analytics` all require Pro or higher, so
  // including them by default would fail this read for every Free-plan
  // connection.
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ transcriptId: "t1" }, ctx);
  const { query } = sent(calls[0]);
  assert(!query.includes("audio_url"));
  assert(!query.includes("video_url"));
  assert(!query.includes("analytics {"));
  assert(!query.includes("sentences {"));
});

test("transcript-get: opt-ins add exactly the groups requested", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({
    transcriptId: "t1",
    includeSentences: true,
    includeMediaUrls: true,
    includeAnalytics: true,
  }, ctx);
  const { query } = sent(calls[0]);
  assert(query.includes("sentences {"));
  assert(query.includes("audio_url"));
  assert(query.includes("analytics {"));
});

test("transcript-get: the summary can be turned off", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  await action.execute({ transcriptId: "t1", includeSummary: false }, ctx);
  assert(!sent(calls[0]).query.includes("summary {"));
});
