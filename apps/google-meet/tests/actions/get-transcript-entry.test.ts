import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-transcript-entry.ts";

Deno.test("get-transcript-entry: GETs the entry by resource name", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        name: "conferenceRecords/cr1/transcripts/t1/entries/e1",
        text: "hello",
        languageCode: "en-US",
      },
    },
  ]);
  const result = await action.execute!({
    name: "conferenceRecords/cr1/transcripts/t1/entries/e1",
  }, ctx) as Record<string, unknown>;
  assertEquals(result.text, "hello");
  assertEquals(calls[0].method, "GET");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v2/conferenceRecords/cr1/transcripts/t1/entries/e1",
  );
});
