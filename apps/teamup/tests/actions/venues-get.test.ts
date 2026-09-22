import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/venues-get.ts";

const sample = { id: 3, object: "venue", venue_type: "online", is_online: true };

Deno.test("venues-get: reads /venues/3 by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  const result = await action.execute!({ id: 3 }, ctx) as typeof sample;
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.origin + url.pathname, "https://goteamup.com/api/v2/venues/3");
  assertEquals(result.venue_type, "online");
});

Deno.test("venues-get: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: sample }]);
  await action.execute!({ id: 3 }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(calls[0].headers["teamup-provider-id"], undefined);
});

Deno.test("venues-get: declares the venue-type and video-url-type vocabularies", () => {
  const fields = action.output as Array<{ key: string; label: string }>;
  const venueType = fields.find((f) => f.key === "venue_type")!.label;
  assertEquals(venueType.includes("physical"), true, venueType);
  assertEquals(venueType.includes("online"), true, venueType);
  const videoType = fields.find((f) => f.key === "video_url_type")!.label;
  assertEquals(videoType.includes("static"), true, videoType);
  assertEquals(videoType.includes("zoom"), true, videoType);
});
