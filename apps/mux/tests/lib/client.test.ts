import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  describeError,
  MuxClient,
  PLAYBACK_POLICIES,
  streamUrl,
  thumbnailUrl,
} from "../../lib/client.ts";

Deno.test("client: calls the Mux API host", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await new MuxClient(ctx).request("/video/v1/assets");
  assertEquals(new URL(calls[0].url).host, "api.mux.com");
  assertEquals(new URL(calls[0].url).pathname, "/video/v1/assets");
});

Deno.test("client: paging unwraps the data envelope and stops on a short page", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: Array.from({ length: 100 }, (_, i) => ({ id: `a${i}` })) } },
    { status: 200, body: { data: [{ id: "last" }] } },
  ]);
  const all = await new MuxClient(ctx).requestAll("/video/v1/assets");
  assertEquals(all.length, 101);
  // Mux's pages are 1-based.
  assertEquals(new URL(calls[0].url).searchParams.get("page"), "1");
  assertEquals(new URL(calls[1].url).searchParams.get("page"), "2");
});

Deno.test("client: an error carries Mux's messages array and the request id", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { error: { type: "invalid_parameters", messages: ["url is invalid"] } },
    headers: { "content-type": "application/json", "x-request-id": "req-1" },
  }]);
  const err = await assertRejects(
    async () => await new MuxClient(ctx).request("/video/v1/assets", { method: "POST" }),
  );
  assert(String(err).includes("url is invalid"), String(err));
  assert(String(err).includes("req-1"), String(err));
});

Deno.test("describeError: a 401 points at the token's permissions", () => {
  assert(/permissions/.test(describeError(401, "{}")), describeError(401, "{}"));
});

/** Assembled locally — these hosts are never fetched. */
Deno.test("streamUrl: builds the HLS URL from a playback id", () => {
  assertEquals(streamUrl("pb123"), "https://stream.mux.com/pb123.m3u8");
});

Deno.test("thumbnailUrl: carries the frame time and sizing", () => {
  const url = new URL(thumbnailUrl("pb123", { time: 5, width: 640, fitMode: "smartcrop" }));
  assertEquals(url.host, "image.mux.com");
  assertEquals(url.pathname, "/pb123/thumbnail.jpg");
  assertEquals(url.searchParams.get("time"), "5");
  assertEquals(url.searchParams.get("width"), "640");
  assertEquals(url.searchParams.get("fit_mode"), "smartcrop");
});

/** A signed id needs a JWT this app cannot mint. */
Deno.test("the playback policies say what signed costs", () => {
  const signed = PLAYBACK_POLICIES.find((p) => p.value === "signed")!;
  assert(/cannot mint/.test(signed.label), signed.label);
});
