import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/recording-get-summary.ts";

Deno.test("recording-get-summary: GETs the recording's summary inline by default", async () => {
  const summary = { template_name: "general", markdown_formatted: "## Summary\nWe reviewed Q1." };
  const { ctx, calls } = mockCtx([{ body: { summary } }]);
  const result = await action.execute({ recordingId: 123456789 }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/external/v1/recordings/123456789/summary");
  // No destination_url — the inline mode.
  assertEquals(url.search, "");
  assertEquals(result, { summary });
});

Deno.test("recording-get-summary: passes destination_url for the async mode", async () => {
  const { ctx, calls } = mockCtx([
    { body: { destination_url: "https://example.com/destination" } },
  ]);
  const result = await action.execute({
    recordingId: 123456789,
    destinationUrl: "https://example.com/destination",
  }, ctx);

  assertEquals(
    new URL(calls[0].url).searchParams.get("destination_url"),
    "https://example.com/destination",
  );
  assertEquals(result, { destination_url: "https://example.com/destination" });
});

Deno.test("recording-get-summary: is a read requiring the recording id", () => {
  assertEquals(action.type, "read");
  const param = action.params?.find((p) => p.key === "recordingId");
  assertEquals(param?.required, true);
  assertEquals(param?.type, "number");
});
