import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-conference-record.ts";

Deno.test("get-conference-record: GETs the record by resource name", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        name: "conferenceRecords/cr1",
        space: "spaces/abc",
        startTime: "2026-01-01T00:00:00Z",
      },
    },
  ]);
  const result = await action.execute!({ name: "conferenceRecords/cr1" }, ctx) as Record<string, unknown>;
  assertEquals(result.space, "spaces/abc");
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v2/conferenceRecords/cr1");
});
