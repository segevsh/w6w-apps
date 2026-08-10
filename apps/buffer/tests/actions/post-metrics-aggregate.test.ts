import { assert, assertEquals } from "@std/assert";
import { data, gqlOf, mockCtx, param } from "../_helpers.ts";
import postMetricsAggregate from "../../actions/post-metrics-aggregate.ts";

const empty = () => data({ aggregatedPostMetrics: { metrics: [], metricsUpdatedAt: null } });

Deno.test("post-metrics-aggregate: both window bounds are required", () => {
  assertEquals(param(postMetricsAggregate, "startDateTime").required, true);
  assertEquals(param(postMetricsAggregate, "endDateTime").required, true);
});

Deno.test("post-metrics-aggregate: the window goes out verbatim", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await postMetricsAggregate.execute({
    organizationId: "o1",
    startDateTime: "2026-01-01T00:00:00Z",
    endDateTime: "2026-01-31T00:00:00Z",
  }, ctx);
  assertEquals(gqlOf(calls[0]).variables, {
    input: {
      organizationId: "o1",
      startDateTime: "2026-01-01T00:00:00Z",
      endDateTime: "2026-01-31T00:00:00Z",
    },
  });
});

/**
 * The opposite-instruction case, and the reason `idList` returns `undefined`
 * rather than `[]` for a blank field: Buffer spans every channel when
 * `channelIds` is omitted, and matches NONE when it is an empty array.
 */
Deno.test("post-metrics-aggregate: a blank channel field is omitted, never sent as []", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await postMetricsAggregate.execute({
    organizationId: "o1",
    startDateTime: "a",
    endDateTime: "b",
    channelIds: "   ",
  }, ctx);
  const input = (gqlOf(calls[0]).variables as { input: Record<string, unknown> }).input;
  assertEquals("channelIds" in input, false);
});

Deno.test("post-metrics-aggregate: supplied channel ids are sent as an array", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await postMetricsAggregate.execute({
    organizationId: "o1",
    startDateTime: "a",
    endDateTime: "b",
    channelIds: "c1,c2",
  }, ctx);
  assertEquals(
    (gqlOf(calls[0]).variables as { input: { channelIds: string[] } }).input.channelIds,
    ["c1", "c2"],
  );
});

Deno.test("post-metrics-aggregate: freshness is selected alongside the numbers", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await postMetricsAggregate.execute({
    organizationId: "o1",
    startDateTime: "a",
    endDateTime: "b",
  }, ctx);
  assert(/metricsUpdatedAt/.test(gqlOf(calls[0]).query));
});

Deno.test("post-metrics-aggregate: the output promises rows, not named metric fields", () => {
  // Which metrics come back depends on the channels in scope — only the
  // postCount/reactions/comments baseline is guaranteed.
  const keys = (postMetricsAggregate.output as Array<{ key: string }>).map((f) => f.key);
  assert(keys.includes("aggregatedPostMetrics.metrics"));
  assert(!keys.some((k) => /impressions|reach|saves/.test(k)));
});

Deno.test("post-metrics-aggregate: the hints carry the 365-day cap and the inclusive end", () => {
  assert(/365 days/.test(String(param(postMetricsAggregate, "startDateTime").hint)));
  assert(/inclusive/.test(String(param(postMetricsAggregate, "endDateTime").hint)));
});
