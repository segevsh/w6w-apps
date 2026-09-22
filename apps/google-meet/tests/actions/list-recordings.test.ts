import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-recordings.ts";

Deno.test("list-recordings: GETs recordings under a conference record", async () => {
  const { ctx, calls } = mockCtx([{ body: { recordings: [], nextPageToken: "t" } }]);
  const result = await action.execute!({ parent: "conferenceRecords/cr1" }, ctx) as Record<string, unknown>;
  assertEquals(result.nextPageToken, "t");
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v2/conferenceRecords/cr1/recordings");
});

Deno.test("list-recordings: forwards pageSize and pageToken", async () => {
  const { ctx, calls } = mockCtx([{ body: { recordings: [] } }]);
  await action.execute!({ parent: "conferenceRecords/cr1", pageSize: 3, pageToken: "tok" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("pageSize"), "3");
  assertEquals(params.get("pageToken"), "tok");
});
