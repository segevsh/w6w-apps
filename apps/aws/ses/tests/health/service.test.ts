import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

/** UTF-16BE with a `FE FF` BOM, as AWS's real feed is served. */
function utf16be(text: string): ArrayBuffer {
  const bytes = new Uint8Array(2 + text.length * 2);
  bytes[0] = 0xfe;
  bytes[1] = 0xff;
  for (let i = 0; i < text.length; i++) {
    bytes[2 + i * 2] = (text.charCodeAt(i) >> 8) & 0xff;
    bytes[3 + i * 2] = text.charCodeAt(i) & 0xff;
  }
  return bytes.buffer;
}

const feed = (events: unknown[]) => ({
  status: 200,
  body: utf16be(JSON.stringify(events)),
  headers: {},
});

Deno.test("service: unsigned, scoped to the AWS health host, and ok on an empty feed", async () => {
  const { ctx, calls } = mockCtx([feed([])]);
  const r = await service.check!({}, ctx);
  assertEquals(calls[0].url, "https://health.aws.amazon.com/public/currentevents");
  assertEquals(service.network?.allow, ["health.aws.amazon.com"]);
  assertEquals(service.kind, "service");
  assertEquals(r.state, "ok");
  assertEquals(r.components, {});
});

Deno.test("service: only `ses-` events count — s3 and sesv2-lookalikes are ignored", async () => {
  const { ctx } = mockCtx([feed([
    { service: "s3-us-east-1", status: "1", summary: "s3 issue" },
    { service: "ses-eu-west-1", status: "0", region_name: "Ireland", summary: "resolved" },
  ])]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "ok");
  assertEquals(r.components, { "eu-west-1": { state: "ok", message: "resolved" } });
});

Deno.test("service: an open SES event is degraded for that region only, naming the region", async () => {
  const { ctx } = mockCtx([feed([
    {
      service: "ses-us-east-1",
      status: "1",
      region_name: "N. Virginia",
      summary: "Elevated send latency",
    },
    { service: "ses-eu-west-1", status: "0", region_name: "Ireland", summary: "resolved" },
  ])]);
  const r = await service.check!({}, ctx);
  assertEquals(r.state, "degraded");
  assertEquals(r.components?.["us-east-1"]?.state, "degraded");
  assertEquals(r.components?.["eu-west-1"]?.state, "ok");
  assertEquals(r.message, "N. Virginia: Elevated send latency");
});

Deno.test("service: a resolved event listed after an open one does not hide the open one", async () => {
  const { ctx } = mockCtx([feed([
    { service: "ses-us-east-1", status: "1", summary: "open" },
    { service: "ses-us-east-1", status: "0", summary: "older, resolved" },
  ])]);
  const r = await service.check!({}, ctx);
  assertEquals(r.components?.["us-east-1"], { state: "degraded", message: "open" });
});

Deno.test("service: a feed failure or garbage is unknown, never down", async () => {
  const bad = mockCtx([{ status: 503, body: "", headers: {} }]);
  assertEquals((await service.check!({}, bad.ctx)).state, "unknown");
  const junk = mockCtx([{ status: 200, body: new ArrayBuffer(4), headers: {} }]);
  assertEquals((await service.check!({}, junk.ctx)).state, "unknown");
  const notArray = mockCtx([{ status: 200, body: utf16be("{}"), headers: {} }]);
  assertEquals((await service.check!({}, notArray.ctx)).state, "unknown");
});
