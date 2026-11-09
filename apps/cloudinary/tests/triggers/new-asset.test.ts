import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-asset.ts";

const options = { display: { cloudName: "acme", region: "us" } };
test("new-asset seeds, emits once, retries idempotently, and requests newest assets", async () => {
  const seeded = await trigger.poll!(
    { params: {}, state: {} },
    mockCtx([{ body: { resources: [{ asset_id: "a" }] } }], options).ctx,
  );
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState.seeded, true);
  const page = { body: { resources: [{ asset_id: "b" }, { asset_id: "a" }] } };
  const first = mockCtx([page], options);
  const emitted = await trigger.poll!({ params: {}, state: seeded.nextState }, first.ctx);
  assertEquals(emitted.events, [{ asset_id: "b" }]);
  assertEquals({
    method: first.calls[0].method,
    path: new URL(first.calls[0].url).pathname,
    body: JSON.parse(first.calls[0].body!),
  }, {
    method: "POST",
    path: "/v1_1/acme/resources/search",
    body: {
      expression: "resource_type:image",
      sort_by: [{ created_at: "desc" }],
      max_results: 100,
    },
  });
  assertEquals(
    await trigger.poll!({ params: {}, state: seeded.nextState }, mockCtx([page], options).ctx),
    emitted,
  );
});
