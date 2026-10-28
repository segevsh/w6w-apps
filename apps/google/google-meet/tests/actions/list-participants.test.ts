import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-participants.ts";

Deno.test("list-participants: GETs participants under a conference record", async () => {
  const { ctx, calls } = mockCtx([
    { body: { participants: [{ name: "p1" }], nextPageToken: "t" } },
  ]);
  const result = await action.execute!({ parent: "conferenceRecords/cr1" }, ctx) as Record<string, unknown>;
  assertEquals(result.nextPageToken, "t");
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v2/conferenceRecords/cr1/participants");
});

Deno.test("list-participants: forwards filter, pageSize and pageToken", async () => {
  const { ctx, calls } = mockCtx([{ body: { participants: [] } }]);
  await action.execute!(
    {
      parent: "conferenceRecords/cr1",
      filter: "latest_end_time IS NULL",
      pageSize: 10,
      pageToken: "tok",
    },
    ctx,
  );
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("filter"), "latest_end_time IS NULL");
  assertEquals(params.get("pageSize"), "10");
  assertEquals(params.get("pageToken"), "tok");
});
