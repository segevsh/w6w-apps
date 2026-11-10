import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-bitlink.ts";
import { clock } from "../../lib/since.ts";

const NOW = Date.UTC(2026, 10, 9, 10, 0, 0);
const input = { params: { groupGuid: "Ba1bc23dE4F" }, subscriptionId: "sub-1" };
const link = (id: string) => ({ id, link: `https://${id}`, long_url: "https://a.com" });
const page = (...links: unknown[]) => mockCtx([{ body: { links } }]);

test("new-bitlink: seeds, emits only new, retries idempotently, filters by created_after", async () => {
  clock.now = () => NOW;
  const seed = page(link("bit.ly/a"));
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  assertEquals(
    seed.calls[0].url,
    "https://api-ssl.bitly.com/v4/groups/Ba1bc23dE4F/bitlinks?created_after=1794218280&size=50",
  );

  const rows = [link("bit.ly/b"), link("bit.ly/a")];
  const first = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  const retry = await trigger.poll!({ ...input, state: seeded.nextState }, page(...rows).ctx);
  assertEquals(first.events, [link("bit.ly/b")]);
  assertEquals(retry, first);
});

test("new-bitlink: walks search_after pages inside one check", async () => {
  clock.now = () => NOW;
  const ctx = mockCtx([
    { body: { links: [link("bit.ly/c")], pagination: { search_after: "tok" } } },
    { body: { links: [link("bit.ly/b")] } },
  ]);
  const seeded = { v: 1, kind: "ids", seeded: true, ids: ["bit.ly/a"], cursor: NOW - 300_000 };
  const out = await trigger.poll!({ ...input, state: seeded }, ctx.ctx);
  assertEquals(out.events.length, 2);
  assertEquals(ctx.calls[1].url.includes("search_after=tok"), true);
});
