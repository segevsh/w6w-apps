import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-recording.ts";

Deno.test("get-recording: GETs the recording by resource name", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        name: "conferenceRecords/cr1/recordings/r1",
        state: "FILE_GENERATED",
        driveDestination: { file: "f1", exportUri: "https://x" },
      },
    },
  ]);
  const result = await action.execute!({ name: "conferenceRecords/cr1/recordings/r1" }, ctx) as Record<string, unknown>;
  assertEquals(result.state, "FILE_GENERATED");
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v2/conferenceRecords/cr1/recordings/r1");
});
