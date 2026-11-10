import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-channel-message.ts";

const PARAMS = { teamId: "team", channelId: "channel" };

test("new-channel-message seeds without emitting, then emits an unseen message", async () => {
  const { ctx, calls } = mockCtx([
    { body: { value: [{ id: "old" }] } },
    { body: { value: [{ id: "new" }, { id: "old" }] } },
  ]);
  const seeded = await trigger.poll!({ params: PARAMS, state: {}, subscriptionId: "sub" }, ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState?.seeded, true);
  const next = await trigger.poll!({
    params: PARAMS,
    state: seeded.nextState!,
    subscriptionId: "sub",
  }, ctx);
  assertEquals(next.events, [{ id: "new" }]);
  assertEquals(calls[0], {
    method: "GET",
    url: "https://graph.microsoft.com/v1.0/teams/team/channels/channel/messages?%24top=50",
    headers: {},
    body: null,
  });
});

test("new-channel-message is idempotent for the same cursor and response", async () => {
  const state = { v: 1 as const, kind: "ids" as const, seeded: true as const, ids: ["old"] };
  const page = { body: { value: [{ id: "new" }, { id: "old" }] } };
  const one = await trigger.poll!(
    { params: PARAMS, state, subscriptionId: "sub" },
    mockCtx([page]).ctx,
  );
  const two = await trigger.poll!(
    { params: PARAMS, state, subscriptionId: "sub" },
    mockCtx([page]).ctx,
  );
  assertEquals(one, two);
});
