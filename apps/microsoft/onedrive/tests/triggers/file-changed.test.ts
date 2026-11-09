import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import trigger from "../../triggers/file-changed.ts";

const DELTA = "https://graph.microsoft.com/v1.0/me/drive/root/delta?token=cursor";

test("file-changed seeds from token=latest without emitting, then emits the delta page", async () => {
  const { ctx, calls } = mockCtx([
    { body: { value: [], "@odata.deltaLink": DELTA } },
    { body: { value: [{ id: "new", name: "Report.docx" }], "@odata.deltaLink": DELTA } },
  ]);
  const seeded = await trigger.poll!({ params: {}, state: {}, subscriptionId: "sub" }, ctx);
  assertEquals(seeded.events, []);
  assertEquals(seeded.nextState?.seeded, true);
  const next = await trigger.poll!(
    { params: {}, state: seeded.nextState!, subscriptionId: "sub" },
    ctx,
  );
  assertEquals(next.events, [{ id: "new", name: "Report.docx" }]);
  assertEquals(calls[0], {
    method: "GET",
    url: "https://graph.microsoft.com/v1.0/me/drive/root/delta?token=latest&%24top=999",
    headers: {},
    body: null,
  });
});

test("file-changed is idempotent for the same delta cursor and response", async () => {
  const state = { v: 1 as const, kind: "token" as const, seeded: true as const, token: DELTA };
  const page = { body: { value: [{ id: "new" }], "@odata.deltaLink": DELTA } };
  const one = await trigger.poll!(
    { params: {}, state, subscriptionId: "sub" },
    mockCtx([page]).ctx,
  );
  const two = await trigger.poll!(
    { params: {}, state, subscriptionId: "sub" },
    mockCtx([page]).ctx,
  );
  assertEquals(one, two);
});

test("file-changed persists a delta page continuation before its final delta link", async () => {
  const next = "https://graph.microsoft.com/v1.0/me/drive/root/delta?skiptoken=page-2";
  const { ctx } = mockCtx([{ body: { value: [{ id: "new" }], "@odata.nextLink": next } }]);
  const state = { v: 1 as const, kind: "token" as const, seeded: true as const, token: DELTA };
  const result = await trigger.poll!({ params: {}, state, subscriptionId: "sub" }, ctx);
  assertEquals(result.events, [{ id: "new" }]);
  assertEquals(result.nextState?.token, next);
});

test("file-changed advances past a resumed delta page larger than 100 items", async () => {
  const items = Array.from({ length: 150 }, (_, i) => ({ id: `item-${i}` }));
  const state = { v: 1 as const, kind: "token" as const, seeded: true as const, token: DELTA };
  const { ctx, calls } = mockCtx([{ body: { value: items, "@odata.deltaLink": "next" } }]);
  const result = await trigger.poll!({ params: {}, state, subscriptionId: "sub" }, ctx);
  assertEquals(result.events, items);
  assertEquals(result.nextState?.token, "next");
  assertEquals(calls[0], {
    method: "GET",
    url: DELTA,
    headers: {},
    body: null,
  });
});

test("file-changed reseeds when Graph expires a delta cursor", async () => {
  const state = { v: 1 as const, kind: "token" as const, seeded: true as const, token: DELTA };
  const next = "https://graph.microsoft.com/v1.0/me/drive/root/delta?token=fresh";
  const { ctx } = mockCtx([
    { status: 410, statusText: "Gone", body: { error: { code: "resyncRequired" } } },
    { body: { value: [], "@odata.deltaLink": next } },
  ]);
  const result = await trigger.poll!({ params: {}, state, subscriptionId: "sub" }, ctx);
  assertEquals(result.events, []);
  assertEquals(result.nextState?.token, next);
});
