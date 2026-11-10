import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-connection.ts";

const params = { accountId: "account-1" };
const connection = (id: string) => ({
  name: `Connection ${id}`,
  profile_url: `https://www.linkedin.com/in/${id}`,
});

test("new-connection seeds, emits, retries, and requests the newest cached page", async () => {
  const seed = mockCtx([{ body: { success: true, data: { connections: [connection("old")] } } }]);
  const seeded = await trigger.poll!({ state: {}, params } as never, seed.ctx);
  assertEquals(seeded.events, []);
  assertEquals((seeded.nextState as { seeded: boolean }).seeded, true);
  assertEquals(seed.calls[0].url, "https://api.linkupapi.com/v2/network");
  assertEquals(JSON.parse(seed.calls[0].body!), {
    account_id: "account-1",
    action: "list_connections",
    params: { count: 100, offset: 0, use_cache: true },
  });
  const responses = [{
    body: { success: true, data: { connections: [connection("new"), connection("old")] } },
  }];
  const first = await trigger.poll!(
    { state: seeded.nextState, params } as never,
    mockCtx(responses).ctx,
  );
  const retry = await trigger.poll!(
    { state: seeded.nextState, params } as never,
    mockCtx(responses).ctx,
  );
  assertEquals(first.events, [connection("new")]);
  assertEquals(retry, first);
});

test("new-connection stays unseeded while the stored copy is not synced", async () => {
  const unsynced = [{ body: { success: true, data: { connections: [], cache_synced: false } } }];
  const a = await trigger.poll!({ state: {}, params } as never, mockCtx(unsynced).ctx);
  assertEquals(a.events, []);
  assertEquals(a.nextState, {});
  const synced = [{
    body: { success: true, data: { connections: [connection("old")], cache_synced: true } },
  }];
  const b = await trigger.poll!({ state: a.nextState, params } as never, mockCtx(synced).ctx);
  assertEquals(b.events, []);
  assertEquals((b.nextState as { seeded: boolean }).seeded, true);
});
