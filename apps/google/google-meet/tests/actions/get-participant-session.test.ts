import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-participant-session.ts";

Deno.test("get-participant-session: GETs the session by resource name", async () => {
  const { ctx, calls } = mockCtx([
    { body: { name: "conferenceRecords/cr1/participants/p1/participantSessions/s1" } },
  ]);
  await action.execute!({
    name: "conferenceRecords/cr1/participants/p1/participantSessions/s1",
  }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v2/conferenceRecords/cr1/participants/p1/participantSessions/s1",
  );
});
