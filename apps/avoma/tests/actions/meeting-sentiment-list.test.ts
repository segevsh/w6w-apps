import { assertEquals } from "@std/assert";
import sentiments from "../../actions/meeting-sentiment-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("meeting-sentiment-list: sends meeting_uuid and folds the bare array into a page", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ sentiment: 1, sentiment_ranges: [] }] }]);
  const out = await sentiments.execute({ meetingUuid: "m1" }, ctx) as {
    results: unknown[];
    count: number;
  };
  assertEquals(pathOf(calls[0].url), "/v1/meeting_sentiments/");
  assertEquals(queryOf(calls[0].url), { meeting_uuid: "m1" });
  assertEquals(out.count, 1);
  assertEquals(out.results.length, 1);
});
