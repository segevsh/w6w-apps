import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import service from "../../health/service.ts";

/** Encode a JS string as UTF-16BE bytes with a `FE FF` BOM, matching AWS's real feed. */
function utf16beWithBom(text: string): ArrayBuffer {
  const bytes = new Uint8Array(2 + text.length * 2);
  bytes[0] = 0xfe;
  bytes[1] = 0xff;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    bytes[2 + i * 2] = (code >> 8) & 0xff;
    bytes[2 + i * 2 + 1] = code & 0xff;
  }
  return bytes.buffer;
}

Deno.test("service: reports ok with no components when the feed has no S3 events", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: utf16beWithBom("[]"), headers: {} }]);
  const report = await service.check!({}, ctx);

  assertEquals(calls[0].url, "https://health.aws.amazon.com/public/currentevents");
  assertEquals(report.state, "ok");
  assertEquals(report.components, {});
});

Deno.test("service: decodes UTF-16BE-with-BOM and ignores non-S3 events", async () => {
  const events = [
    {
      service: "directconnect-ap-south-1",
      status: "1",
      region_name: "Mumbai",
      summary: "packet loss",
    },
    { service: "s3-eu-west-1", status: "0", region_name: "Ireland", summary: "resolved issue" },
  ];
  const { ctx } = mockCtx([
    { status: 200, body: utf16beWithBom(JSON.stringify(events)), headers: {} },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "ok"); // the s3 event is status "0" (resolved) — no open s3 incident
  assertEquals(report.components, { "eu-west-1": { state: "ok", message: "resolved issue" } });
});

Deno.test("service: an open S3 event reports degraded with a per-region component", async () => {
  const events = [
    {
      service: "s3-us-east-1",
      status: "1",
      region_name: "N. Virginia",
      summary: "Elevated error rates",
    },
    { service: "s3-eu-west-1", status: "0", region_name: "Ireland", summary: "resolved" },
  ];
  const { ctx } = mockCtx([
    { status: 200, body: utf16beWithBom(JSON.stringify(events)), headers: {} },
  ]);
  const report = await service.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assertEquals(report.components?.["us-east-1"]?.state, "degraded");
  assertEquals(report.components?.["eu-west-1"]?.state, "ok");
  assertEquals(report.message?.includes("N. Virginia"), true);
});

Deno.test("service: a non-ok status reports unknown, not down", async () => {
  const { ctx } = mockCtx([{ status: 500, body: utf16beWithBom("[]"), headers: {} }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});

Deno.test("service: unparseable bytes report unknown rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: new ArrayBuffer(4), headers: {} }]);
  const report = await service.check!({}, ctx);
  assertEquals(report.state, "unknown");
});
