import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-index.ts";

test("new-index snapshots all index pages and emits additions idempotently", async () => {
  const input = { params: {}, subscriptionId: "s" };
  const seed = mockCtx([{ body: { items: [{ name: "a" }], nbPages: 1 } }], {
    display: { appId: "APPID" },
  });
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://appid-dsn.algolia.net/1/indexes?page=0&hitsPerPage=1000",
  );
  const run = () =>
    trigger.poll!(
      { ...input, state: seeded.nextState },
      mockCtx([{ body: { items: [{ name: "a" }, { name: "b" }], nbPages: 1 } }], {
        display: { appId: "APPID" },
      }).ctx,
    );
  assertEquals((await run()).events.map((event) => (event as { key: string }).key), ["b"]);
  assertEquals(await run(), await run());
});
