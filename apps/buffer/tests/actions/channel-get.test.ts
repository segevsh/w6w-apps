import { assert, assertEquals } from "@std/assert";
import { data, gqlOf, mockCtx } from "../_helpers.ts";
import channelGet from "../../actions/channel-get.ts";

Deno.test("channel-get: ChannelInput takes only an id — no organization needed", async () => {
  const { ctx, calls } = mockCtx([data({ channel: { id: "c1" } })]);
  await channelGet.execute({ channelId: "c1" }, ctx);
  assertEquals(gqlOf(calls[0]).variables, { input: { id: "c1" } });
});

Deno.test("channel-get: adds the posting schedule, which the list action omits", async () => {
  const { ctx, calls } = mockCtx([data({ channel: { id: "c1" } })]);
  await channelGet.execute({ channelId: "c1" }, ctx);
  const { query } = gqlOf(calls[0]);
  assert(/postingSchedule\s*\{\s*day\s+times\s+paused\s*\}/.test(query), query);
});

Deno.test("channel-get: takes exactly one required param", () => {
  assertEquals((channelGet.params ?? []).map((p) => p.key), ["channelId"]);
  assertEquals((channelGet.params ?? [])[0].required, true);
  assertEquals(channelGet.type, "read");
});

Deno.test("channel-get: the output declares the schedule alongside the shared channel fields", () => {
  const keys = (channelGet.output as Array<{ key: string }>).map((f) => f.key);
  assert(keys.includes("postingSchedule"));
  assert(keys.includes("service"));
});
