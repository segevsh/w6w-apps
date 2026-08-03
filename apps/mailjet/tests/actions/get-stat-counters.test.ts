import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import getStatCounters from "../../actions/get-stat-counters.ts";

// ------------------------------------------------------------ get-stat-counters

Deno.test("get-stat-counters: sends the three mandatory dimensions", async () => {
  const { ctx, calls } = mockCtx([{ body: { Data: [{ MessageSentCount: 10 }] } }]);
  await getStatCounters.execute!(
    { counterSource: "APIKey", counterResolution: "Lifetime", counterTiming: "Message" },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(new URL(calls[0].url).pathname, "/v3/REST/statcounters");
  assertEquals(p.get("CounterSource"), "APIKey");
  assertEquals(p.get("CounterResolution"), "Lifetime");
  assertEquals(p.get("CounterTiming"), "Message");
});

Deno.test("get-stat-counters: defaults are the one combination needing no extra input", () => {
  const byKey = Object.fromEntries(
    (getStatCounters.params ?? []).map((p) => [p.key, p.default]),
  );
  assertEquals(byKey.counterSource, "APIKey");
  assertEquals(byKey.counterResolution, "Lifetime");
  assertEquals(byKey.counterTiming, "Message");
});

Deno.test("get-stat-counters: forwards SourceID and the time window when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { Data: [] } }]);
  await getStatCounters.execute!({
    counterSource: "Campaign",
    counterResolution: "Day",
    counterTiming: "Event",
    sourceId: "123,456",
    fromTs: "2026-08-01T00:00:00Z",
    toTs: "2026-08-03T00:00:00Z",
  }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("SourceID"), "123,456");
  assertEquals(p.get("FromTS"), "2026-08-01T00:00:00Z");
  assertEquals(p.get("ToTS"), "2026-08-03T00:00:00Z");
});

Deno.test("get-stat-counters: omits SourceID and FromTS when not supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { Data: [] } }]);
  await getStatCounters.execute!(
    { counterSource: "APIKey", counterResolution: "Lifetime", counterTiming: "Message" },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assert(!p.has("SourceID"));
  assert(!p.has("FromTS"));
});
