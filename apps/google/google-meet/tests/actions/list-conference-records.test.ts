import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-conference-records.ts";

Deno.test("list-conference-records: GETs the account-wide collection", async () => {
  const { ctx, calls } = mockCtx([{ body: { conferenceRecords: [], nextPageToken: "t" } }]);
  const result = await action.execute!({}, ctx) as Record<string, unknown>;
  assertEquals(result.nextPageToken, "t");
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v2/conferenceRecords");
});

Deno.test("list-conference-records: forwards filter, pageSize and pageToken", async () => {
  const { ctx, calls } = mockCtx([{ body: { conferenceRecords: [] } }]);
  await action.execute!(
    { filter: 'space.name = "spaces/abc"', pageSize: 50, pageToken: "tok" },
    ctx,
  );
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("filter"), 'space.name = "spaces/abc"');
  assertEquals(params.get("pageSize"), "50");
  assertEquals(params.get("pageToken"), "tok");
});
