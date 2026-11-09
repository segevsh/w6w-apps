import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-campaign.ts";

test("new-or-updated-campaign emits an edit and requests newest edits first", async () => {
  const opts = { display: { instance: "iad-01" } };
  const seed = await trigger.poll!(
    { params: {}, state: {} },
    mockCtx([{ body: { campaigns: [{ id: "a", last_edited: "1" }] } }], opts).ctx,
  );
  assertEquals(seed.events, []);
  const nextCtx = mockCtx([{
    body: { campaigns: [{ id: "a", last_edited: "2" }, { id: "a", last_edited: "1" }] },
  }], opts);
  const next = await trigger.poll!({ params: {}, state: seed.nextState }, nextCtx.ctx);
  assertEquals(next.events, [{ id: "a", last_edited: "2" }]);
  const retry = await trigger.poll!(
    { params: {}, state: seed.nextState },
    mockCtx(
      [{ body: { campaigns: [{ id: "a", last_edited: "2" }, { id: "a", last_edited: "1" }] } }],
      opts,
    ).ctx,
  );
  assertEquals(retry, next);
  assertEquals(
    nextCtx.calls[0].url,
    "https://rest.iad-01.braze.com/campaigns/list?page=0&include_archived=false&sort_direction=desc",
  );
});
