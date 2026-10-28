import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-participant-sessions.ts";

Deno.test("list-participant-sessions: GETs sessions under a participant", async () => {
  const { ctx, calls } = mockCtx([{ body: { participantSessions: [], nextPageToken: "t" } }]);
  const result = await action.execute!({
    parent: "conferenceRecords/cr1/participants/p1",
  }, ctx) as Record<string, unknown>;
  assertEquals(result.nextPageToken, "t");
  assertEquals(calls[0].method, "GET");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v2/conferenceRecords/cr1/participants/p1/participantSessions",
  );
});

Deno.test("list-participant-sessions: forwards filter and pagination", async () => {
  const { ctx, calls } = mockCtx([{ body: { participantSessions: [] } }]);
  await action.execute!({
    parent: "conferenceRecords/cr1/participants/p1",
    filter: "end_time IS NULL",
    pageSize: 5,
    pageToken: "tok",
  }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("filter"), "end_time IS NULL");
  assertEquals(params.get("pageSize"), "5");
  assertEquals(params.get("pageToken"), "tok");
});
