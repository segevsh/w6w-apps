import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { hostFor, MixpanelClient, normalizeRegion, queryDate } from "../../lib/client.ts";

const conn = { display: { projectId: "123", region: "us" } };

/** Three host families, three regions each — nine hosts, all verified live. */
Deno.test("hostFor: each plane has its own host family", () => {
  assertEquals(hostFor("query", "us"), "https://mixpanel.com");
  assertEquals(hostFor("ingest", "us"), "https://api.mixpanel.com");
  assertEquals(hostFor("export", "us"), "https://data.mixpanel.com");

  assertEquals(hostFor("query", "eu"), "https://eu.mixpanel.com");
  assertEquals(hostFor("ingest", "eu"), "https://api-eu.mixpanel.com");
  assertEquals(hostFor("export", "eu"), "https://data-eu.mixpanel.com");

  assertEquals(hostFor("query", "in"), "https://in.mixpanel.com");
  assertEquals(hostFor("ingest", "in"), "https://api-in.mixpanel.com");
  assertEquals(hostFor("export", "in"), "https://data-in.mixpanel.com");
});

Deno.test("normalizeRegion: anything unrecognised falls back to us", () => {
  assertEquals(normalizeRegion("EU"), "eu");
  assertEquals(normalizeRegion("mars"), "us");
  assertEquals(normalizeRegion(undefined), "us");
});

/** One service account can reach many projects, so every call names one. */
Deno.test("client: project_id is appended to every request", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await new MixpanelClient(ctx).request("/api/query/segmentation");
  assertEquals(new URL(calls[0].url).searchParams.get("project_id"), "123");
});

Deno.test("client: routes that carry the project in the path skip the parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], conn);
  await new MixpanelClient(ctx).request("/api/app/projects/123/schemas", { noProjectId: true });
  assertEquals(new URL(calls[0].url).searchParams.get("project_id"), null);
});

Deno.test("client: a connection with no project id fails with a fixable message", () => {
  const { ctx } = mockCtx([], { display: { region: "us" } });
  assertThrows(() => new MixpanelClient(ctx), Error, "project id");
});

/** The Query API sends no rate-limit headers; a 429 is the whole signal. */
Deno.test("client: a 429 explains the sixty-an-hour limit", async () => {
  const { ctx } = mockCtx([{ status: 429, body: { error: "too many requests" } }], conn);
  const err = await assertRejects(
    async () => await new MixpanelClient(ctx).request("/api/query/segmentation"),
  );
  assert(/60 queries an hour/.test(String(err)), String(err));
});

/** strict=1 reports per-record failures; the first one is the useful part. */
Deno.test("client: an import failure surfaces the first failed record", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: {
      code: 400,
      error: "some data points in the request failed validation",
      num_records_imported: 2,
      failed_records: [{ index: 3, field: "properties.time", message: "missing" }],
    },
  }], conn);
  const err = await assertRejects(
    async () =>
      await new MixpanelClient(ctx).request("/import", {
        plane: "ingest",
        method: "POST",
        body: [],
      }),
  );
  assert(/index 3/.test(String(err)), String(err));
  assert(/properties.time/.test(String(err)), String(err));
});

/** The export API answers JSONL — JSON.parse on the whole body would fail. */
Deno.test("client: requestJsonl parses one object per line", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: '{"event":"a","properties":{"time":1}}\n{"event":"b","properties":{"time":2}}\n',
    headers: { "content-type": "text/plain" },
  }], conn);
  const rows = await new MixpanelClient(ctx).requestJsonl("/api/2.0/export", { plane: "export" });
  assertEquals(rows.length, 2);
  assertEquals((rows[0] as { event: string }).event, "a");
  assertEquals(new URL(calls[0].url).host, "data.mixpanel.com");
});

Deno.test("client: a non-JSON line in an export is reported, not swallowed", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "{}\nnot json\n" }], conn);
  await assertRejects(
    async () => await new MixpanelClient(ctx).requestJsonl("/api/2.0/export", { plane: "export" }),
    Error,
    "not JSON",
  );
});

Deno.test("queryDate: accepts yyyy-mm-dd, truncates an ISO timestamp, rejects rubbish", () => {
  assertEquals(queryDate("2026-08-18", "fromDate"), "2026-08-18");
  assertEquals(queryDate("2026-08-18T13:45:00Z", "fromDate"), "2026-08-18");
  assertEquals(queryDate("", "fromDate"), undefined);
  assertThrows(() => queryDate("last tuesday", "fromDate"), Error, "fromDate");
});
