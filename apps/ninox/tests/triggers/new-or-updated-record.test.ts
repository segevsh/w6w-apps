import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import trigger from "../../triggers/new-or-updated-record.ts";
import { connCtx, listEnvelope } from "../_helpers.ts";

const params = { moduleName: "crm", tableName: "contacts" };
const rec = (id: string, md: string) => ({ id, values: { _md: md } });

test("new-or-updated-record has the honest key and requests the last-modified page", async () => {
  assertEquals(trigger.key, "new-or-updated-record");
  const seed = connCtx([{ body: listEnvelope([rec("old", "t1")]) }]);
  const seeded = await trigger.poll!({ state: {}, params } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(
    seed.calls[0].url,
    "https://go.ninox.com/api/v1/workspace/abcdefghij12/modules/crm/tables/contacts/records?sort=-_md&limit=100&offset=0",
  );
});

test("a seeded record whose _md changes fires exactly once; replay fires nothing", async () => {
  const seed = connCtx([{ body: listEnvelope([rec("a", "t1"), rec("b", "t0")]) }]);
  const seeded = await trigger.poll!({ state: {}, params } as never, seed.ctx);
  const edited = [{ body: listEnvelope([rec("a", "t2"), rec("a2x", "t1"), rec("b", "t0")]) }];
  const first = await trigger.poll!(
    { state: seeded.nextState, params } as never,
    connCtx(edited).ctx,
  );
  const retry = await trigger.poll!(
    { state: seeded.nextState, params } as never,
    connCtx(edited).ctx,
  );
  assertEquals(first.events.length, 2);
  assertEquals(retry, first);
  const again = await trigger.poll!(
    { state: first.nextState, params } as never,
    connCtx(edited).ctx,
  );
  assertEquals(again.events, []);
});

test("exactly one event when only one record's _md changed", async () => {
  const seeded = await trigger.poll!(
    { state: {}, params } as never,
    connCtx([{ body: listEnvelope([rec("a", "t1"), rec("b", "t0")]) }]).ctx,
  );
  const out = await trigger.poll!(
    { state: seeded.nextState, params } as never,
    connCtx([{ body: listEnvelope([rec("a", "t2"), rec("b", "t0")]) }]).ctx,
  );
  assertEquals(out.events, [rec("a", "t2")]);
});
