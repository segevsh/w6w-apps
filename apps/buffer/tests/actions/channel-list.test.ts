import { assert, assertEquals } from "@std/assert";
import { data, gqlOf, mockCtx, optionValues } from "../_helpers.ts";
import channelList from "../../actions/channel-list.ts";

Deno.test("channel-list: sends only the organization id when nothing is filtered", async () => {
  const { ctx, calls } = mockCtx([data({ channels: [] })]);
  await channelList.execute({ organizationId: "o1" }, ctx);
  assertEquals(gqlOf(calls[0]).variables, { input: { organizationId: "o1" } });
});

Deno.test("channel-list: the locked select becomes a real boolean, not the string", async () => {
  const { ctx, calls } = mockCtx([data({ channels: [] })]);
  await channelList.execute({ organizationId: "o1", locked: "false" }, ctx);
  // `"false"` is truthy — sending the string would invert the filter and
  // silently return the channels you cannot post to.
  assertEquals(gqlOf(calls[0]).variables, {
    input: { organizationId: "o1", filter: { isLocked: false } },
  });
});

Deno.test("channel-list: locked=true filters the other way", async () => {
  const { ctx, calls } = mockCtx([data({ channels: [] })]);
  await channelList.execute({ organizationId: "o1", locked: "true" }, ctx);
  assertEquals(
    (gqlOf(calls[0]).variables as { input: { filter: { isLocked: boolean } } }).input.filter
      .isLocked,
    true,
  );
});

Deno.test("channel-list: the product filter passes through", async () => {
  const { ctx, calls } = mockCtx([data({ channels: [] })]);
  await channelList.execute({ organizationId: "o1", product: "publish" }, ctx);
  assertEquals(gqlOf(calls[0]).variables, {
    input: { organizationId: "o1", filter: { product: "publish" } },
  });
});

Deno.test("channel-list: offers no network filter — ChannelsFiltersInput has none", () => {
  const keys = (channelList.params ?? []).map((p) => p.key);
  assertEquals(keys, ["organizationId", "locked", "product"]);
  assert(!keys.includes("service"), "a service filter would silently do nothing");
});

Deno.test("channel-list: the product options are Buffer's six", () => {
  assertEquals(optionValues(channelList, "product"), [
    "analyze",
    "engage",
    "publish",
    "buffer",
    "startPage",
    "comments",
  ]);
});

Deno.test("channel-list: selects the three flags a workflow needs to branch on", async () => {
  const { ctx, calls } = mockCtx([data({ channels: [] })]);
  await channelList.execute({ organizationId: "o1" }, ctx);
  const { query } = gqlOf(calls[0]);
  assert(/isDisconnected/.test(query), query);
  assert(/isLocked/.test(query), query);
  // A paused queue accepts a post and then never publishes it.
  assert(/isQueuePaused/.test(query), query);
});
