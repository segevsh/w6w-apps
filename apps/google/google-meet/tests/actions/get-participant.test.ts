import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-participant.ts";

test("get-participant: GETs the participant by resource name", async () => {
  const { ctx, calls } = mockCtx([
    { body: { name: "conferenceRecords/cr1/participants/p1", signedinUser: { user: "users/1" } } },
  ]);
  const result = await action.execute!({ name: "conferenceRecords/cr1/participants/p1" }, ctx) as Record<string, unknown>;
  assertEquals(result.name, "conferenceRecords/cr1/participants/p1");
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v2/conferenceRecords/cr1/participants/p1");
});
