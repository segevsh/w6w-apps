import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/asset-create.ts";

const ok = { status: 201, body: { data: { id: "a1", status: "preparing" } } };

/** Mux fetches the URL — the bytes never pass through the workflow. */
Deno.test("asset-create: sends the input URL for Mux to fetch", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute!({ url: "https://example.com/v.mp4", passthrough: "order-4417" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/video/v1/assets");
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.input, [{ url: "https://example.com/v.mp4" }]);
  assertEquals(sent.playback_policies, ["public"]);
  assertEquals(sent.passthrough, "order-4417");
});

/** The app cannot mint the JWT a signed id needs. */
Deno.test("asset-create: a signed policy is warned about", async () => {
  const { ctx, logs } = mockCtx([ok]);
  await action.execute!({ url: "https://x.test/v.mp4", playbackPolicy: "signed" }, ctx);
  assert(
    logs.some((l) => l.level === "warn" && /cannot mint/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("asset-create: subtitles ride along on the input", async () => {
  const { ctx, calls } = mockCtx([ok]);
  await action.execute!({ url: "https://x.test/v.mp4", generateSubtitles: true }, ctx);
  const sent = JSON.parse(calls[0].body!);
  assert(Array.isArray(sent.input[0].generated_subtitles), JSON.stringify(sent.input));
});

Deno.test("asset-create: a missing URL is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(async () => await action.execute!({}, ctx), Error, "url");
  assertEquals(calls.length, 0);
});

/** `preparing`, not ready — publishing its URL immediately publishes nothing. */
Deno.test("asset-create: says the asset is not playable yet", () => {
  assert(/preparing/.test(action.description!), action.description);
  assertEquals(action.idempotent, false);
});
