import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-project.ts";

test("new-project snapshots its management collection and emits additions idempotently", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const seed = mockCtx([{ body: { projects: [{ project_id: 1 }] } }]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://api.ahrefs.com/v3/management/projects");
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: { projects: [{ project_id: 1 }, { project_id: 2 }] } }]).ctx,
    );
  assertEquals((await run()).events.map((event) => (event as { key: string }).key), ["2"]);
  assertEquals(await run(), await run());
});
