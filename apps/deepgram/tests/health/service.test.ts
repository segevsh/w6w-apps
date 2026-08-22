import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

const page = (components: Array<Record<string, unknown>>) => ({
  status: 200,
  body: { components },
});

Deno.test("service: reads the surfaces this app uses and rolls them up", async () => {
  const { ctx, calls } = mockCtx([page([
    { name: "Batch API", status: "operational" },
    { name: "TTS API", status: "operational" },
    { name: "Management APIs", status: "operational" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://status.deepgram.com/api/v2/components.json");
  assertEquals(result.state, "ok");
  assertEquals(Object.keys(result.components!).sort(), ["batch-api", "management-apis", "tts-api"]);
});

/**
 * Streaming and Voice Agent are WebSocket surfaces this app cannot reach, so
 * their outages say nothing about whether its actions will work.
 */
Deno.test("service: a streaming outage does not count", async () => {
  const { ctx } = mockCtx([page([
    { name: "Batch API", status: "operational" },
    { name: "Streaming API", status: "major_outage" },
    { name: "Voice Agent API", status: "major_outage" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(result.components!["streaming-api"], undefined);
});

/** A TTS outage with a healthy batch API is a real, partial answer. */
Deno.test("service: a TTS outage is down and is named", async () => {
  const { ctx } = mockCtx([page([
    { name: "Batch API", status: "operational" },
    { name: "TTS API", status: "major_outage" },
  ])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "down");
  assert(/TTS API/.test(result.message!), result.message);
});

Deno.test("service: degraded performance is degraded, not down", async () => {
  const { ctx } = mockCtx([page([{ name: "Batch API", status: "degraded_performance" }])]);
  assertEquals((await service.check!({}, ctx)).state, "degraded");
});

Deno.test("service: component groups are skipped, not counted twice", async () => {
  const { ctx } = mockCtx([page([
    { name: "Deepgram Public API (api.deepgram.com)", status: "major_outage", group: true },
    { name: "Batch API", status: "operational" },
  ])]);
  assertEquals((await service.check!({}, ctx)).state, "ok");
});

/** A status page that itself fails tells us nothing about Deepgram. */
Deno.test("service: a broken status page is unknown, never down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await service.check!({}, ctx)).state, "unknown");

  const shapeless = mockCtx([{ status: 200, body: { nope: true } }]);
  assertEquals((await service.check!({}, shapeless.ctx)).state, "unknown");
});

Deno.test("service: a page naming none of the used surfaces says so", async () => {
  const { ctx } = mockCtx([page([{ name: "Streaming API", status: "operational" }])]);
  const result = await service.check!({}, ctx);
  assertEquals(result.state, "unknown");
  assert(/no longer names/.test(result.message!), result.message);
});

Deno.test("service: declares the status host, which is not the API host", () => {
  assertEquals(service.network!.allow, ["status.deepgram.com"]);
});
