import { assert, assertEquals, assertThrows } from "@std/assert";
import { data, gqlOf, mockCtx, param } from "../_helpers.ts";
import dailyPostingLimitList from "../../actions/daily-posting-limit-list.ts";

const empty = () => data({ dailyPostingLimits: [] });

Deno.test("daily-posting-limit-list: channel ids are required and go out as an array", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await dailyPostingLimitList.execute({ channelIds: "c1, c2" }, ctx);
  assertEquals(gqlOf(calls[0]).variables, { input: { channelIds: ["c1", "c2"] } });
  assertEquals(param(dailyPostingLimitList, "channelIds").required, true);
});

Deno.test("daily-posting-limit-list: date rides along when set, absent otherwise", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await dailyPostingLimitList.execute({ channelIds: "c1", date: "2026-05-01T00:00:00Z" }, ctx);
  assertEquals(
    (gqlOf(calls[0]).variables as { input: { date: string } }).input.date,
    "2026-05-01T00:00:00Z",
  );

  const { ctx: ctx2, calls: calls2 } = mockCtx([empty()]);
  await dailyPostingLimitList.execute({ channelIds: "c1" }, ctx2);
  assertEquals("date" in (gqlOf(calls2[0]).variables as { input: object }).input, false);
});

Deno.test("daily-posting-limit-list: an empty channel field fails locally, not on the server", () => {
  const { ctx, calls } = mockCtx([]);
  // `channelIds` is `[ChannelId!]!` — there is no all-channels form, and
  // sending `[]` would be a server round-trip to learn nothing.
  assertThrows(
    () => dailyPostingLimitList.execute({ channelIds: "  " }, ctx),
    Error,
    "at least one channel",
  );
  assertEquals(calls.length, 0);
});

Deno.test("daily-posting-limit-list: selects the flag a workflow branches on", async () => {
  const { ctx, calls } = mockCtx([empty()]);
  await dailyPostingLimitList.execute({ channelIds: "c1" }, ctx);
  const { query } = gqlOf(calls[0]);
  assert(/isAtLimit/.test(query), query);
  // sent vs scheduled: the cap can be consumed by either.
  assert(/\bsent\b/.test(query) && /\bscheduled\b/.test(query), query);
});

Deno.test("daily-posting-limit-list: the hint warns about the same-organization rule", () => {
  assert(/same organization/i.test(String(param(dailyPostingLimitList, "channelIds").hint)));
});
