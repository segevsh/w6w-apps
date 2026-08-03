import { assertEquals } from "@std/assert";
import { mockCtx, outputKeys } from "../_helpers.ts";
import action from "../../actions/recording-get-transcript.ts";

Deno.test("recording-get-transcript: GETs the recording's transcript inline by default", async () => {
  const transcript = [{
    speaker: { display_name: "Jane Doe", matched_calendar_invitee_email: "jane.doe@acme.com" },
    text: "Let's revisit the budget allocations.",
    timestamp: "00:05:32",
  }];
  const { ctx, calls } = mockCtx([{ body: { transcript } }]);
  const result = await action.execute({ recordingId: 123456789 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/external/v1/recordings/123456789/transcript");
  assertEquals(url.search, "");
  assertEquals(result, { transcript });
});

Deno.test("recording-get-transcript: passes destination_url for the async mode", async () => {
  const { ctx, calls } = mockCtx([
    { body: { destination_url: "https://example.com/destination" } },
  ]);
  await action.execute({
    recordingId: 42,
    destinationUrl: "https://example.com/destination",
  }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("destination_url"),
    "https://example.com/destination",
  );
});

Deno.test("recording-get-transcript: declares the transcript output field", () => {
  assertEquals(outputKeys(action), ["transcript", "destination_url"]);
});
