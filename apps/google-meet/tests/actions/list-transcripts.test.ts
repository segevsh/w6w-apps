import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-transcripts.ts";

Deno.test("list-transcripts: GETs transcripts under a conference record", async () => {
  const { ctx, calls } = mockCtx([{ body: { transcripts: [], nextPageToken: "t" } }]);
  const result = await action.execute!({ parent: "conferenceRecords/cr1" }, ctx) as Record<string, unknown>;
  assertEquals(result.nextPageToken, "t");
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v2/conferenceRecords/cr1/transcripts");
});

Deno.test("list-transcripts: forwards pageSize and pageToken", async () => {
  const { ctx, calls } = mockCtx([{ body: { transcripts: [] } }]);
  await action.execute!({ parent: "conferenceRecords/cr1", pageSize: 7, pageToken: "tok" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("pageSize"), "7");
  assertEquals(params.get("pageToken"), "tok");
});
