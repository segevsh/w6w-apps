import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-transcript-entries.ts";

Deno.test("list-transcript-entries: GETs entries under a transcript", async () => {
  const { ctx, calls } = mockCtx([{ body: { transcriptEntries: [], nextPageToken: "t" } }]);
  const result = await action.execute!({
    parent: "conferenceRecords/cr1/transcripts/t1",
  }, ctx) as Record<string, unknown>;
  assertEquals(result.nextPageToken, "t");
  assertEquals(calls[0].method, "GET");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v2/conferenceRecords/cr1/transcripts/t1/entries",
  );
});

Deno.test("list-transcript-entries: forwards pageSize and pageToken", async () => {
  const { ctx, calls } = mockCtx([{ body: { transcriptEntries: [] } }]);
  await action.execute!({
    parent: "conferenceRecords/cr1/transcripts/t1",
    pageSize: 20,
    pageToken: "tok",
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("pageSize"), "20");
  assertEquals(params.get("pageToken"), "tok");
});
