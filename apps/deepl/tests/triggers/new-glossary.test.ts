import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-glossary.ts";

const input = { params: {}, subscriptionId: "sub-1" };
const item = (id: string) => ({
  glossaryId: id,
  name: `Glossary ${id}`,
  ready: true,
  sourceLang: "EN",
  targetLang: "DE",
  creationTime: "2026-01-01T00:00:00Z",
  entryCount: 3,
});
const raw = (id: string) => ({
  glossary_id: id,
  name: `Glossary ${id}`,
  ready: true,
  source_lang: "EN",
  target_lang: "DE",
  creation_time: "2026-01-01T00:00:00Z",
  entry_count: 3,
});
const page = (ids: string[]) => ({ body: { glossaries: ids.map(raw) } });

test("new-glossary: seeds, emits only new glossaries, retries idempotently, lists /v2/glossaries", async () => {
  const seed = mockCtx([page(["a"])]);
  const seeded = await trigger.poll!({ ...input, state: {} }, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded?: boolean }).seeded, true);
  assertEquals(seed.calls[0].method, "GET");
  const url = new URL(seed.calls[0].url);
  assertEquals(url.pathname, "/v2/glossaries");
  assertEquals(url.search, "");

  const first = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(["a", "b"])]).ctx,
  );
  const retry = await trigger.poll!(
    { ...input, state: seeded.nextState },
    mockCtx([page(["a", "b"])]).ctx,
  );
  assertEquals(first.events, [item("b")]);
  assertEquals(retry, first);
});
