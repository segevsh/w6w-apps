import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/new-or-updated-form.ts";

const params = {};
const A = { id: "form-a", modifiedTime: "2026-11-09T00:00:00Z" };
const B = { id: "form-b", modifiedTime: "2026-11-09T01:00:00Z" };
const ctxFor = (items: unknown[]) => {
  const r = [{ body: { files: items } }];
  return mockCtx(r);
};
const poll = (state: unknown, items: unknown[]) => {
  const c = ctxFor(items);
  return trigger.poll!({ params, state, subscriptionId: "s" }, c.ctx).then((result) => ({
    result,
    calls: c.calls,
  }));
};
const seedState = async () => (await poll({}, [A])).result.nextState;

test("new-or-updated-form seeds the first check without emitting", async () => {
  const { result } = await poll({}, [B, A]);
  assertEquals(result.events, []);
  assertEquals((result.nextState as { seeded?: boolean }).seeded, true);
});

test("new-or-updated-form emits exactly the new item from the seeded state", async () => {
  const state = await seedState();
  const { result } = await poll(state, [B, A]);
  assertEquals(result.events, [B]);
});

test("new-or-updated-form returns identical results when a check is retried with the same state and responses", async () => {
  const state = await seedState();
  const first = await poll(state, [B, A]);
  const second = await poll(state, [B, A]);
  assertEquals(second.result, first.result);
  assertEquals(
    second.calls.map((c) => [c.method, c.url, c.body]),
    first.calls.map((c) => [c.method, c.url, c.body]),
  );
});

test("new-or-updated-form emits an edited item again because the update stamp is in its id", async () => {
  const state = await seedState();
  const edited = { ...A, modifiedTime: "2026-11-10T00:00:00Z" };
  const { result } = await poll(state, [edited]);
  assertEquals(result.events, [edited]);
});

test("new-or-updated-form requests modified-time descending, 200 per page", async () => {
  const state = await seedState();
  const { calls } = await poll(state, [A]);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.form%27+and+trashed%3Dfalse&pageSize=200&orderBy=modifiedTime+desc&fields=nextPageToken%2CincompleteSearch%2Cfiles%28id%2Cname%2CcreatedTime%2CmodifiedTime%2CwebViewLink%29",
  );
});
