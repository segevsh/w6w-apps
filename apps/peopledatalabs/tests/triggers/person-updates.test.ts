import assert from "node:assert/strict";
import test from "node:test";
import personUpdates from "../../triggers/person-updates.ts";

const CALLBACK = "https://w6w.example/triggers/webhooks/sub_123";
const KEY = "Bearer test-shared-key";
// Non-canonical whitespace: JSON.stringify(JSON.parse(BODY)) !== BODY.
const BODY = '[ "9adnit66-hdZ5lkBbq-AOQ_0000",\n  "YraxDoP16jzyjfxtn-1XJQ_0000" ]';
const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

function call(over: Record<string, unknown> = {}) {
  return {
    method: "POST",
    path: "/",
    query: {},
    headers: { Authorization: KEY } as Record<string, string>,
    body: JSON.parse(BODY),
    rawBody: BODY as string | undefined,
    ...over,
  };
}
const ingest = async (raw: unknown, params: unknown = { sharedKey: KEY }) =>
  await personUpdates.handleIngest!({ raw, params } as never);

test("fixture really has non-canonical whitespace", () => {
  assert.notEqual(JSON.stringify(JSON.parse(BODY)), BODY);
});

test("onSubscribe makes no vendor call and hands back the callback URL; onUnsubscribe is a no-op", async () => {
  const state = await personUpdates.onSubscribe!(
    { params: {}, callbackUrl: CALLBACK },
    {} as never,
  );
  assert.deepEqual(state, { callbackUrl: CALLBACK });
  assert.equal(
    await personUpdates.onUnsubscribe!({ params: {}, state } as never, {} as never),
    undefined,
  );
});

test("a delivery with the matching shared key becomes one batch event", async () => {
  assert.deepEqual(evs(await ingest(call())), [{
    pdlIds: ["9adnit66-hdZ5lkBbq-AOQ_0000", "YraxDoP16jzyjfxtn-1XJQ_0000"],
    count: 2,
  }]);
});

test("the header name is case-insensitive and configurable", async () => {
  assert.equal(evs(await ingest(call({ headers: { authorization: KEY } }))).length, 1);
  const out = await ingest(call({ headers: { "X-Pdl-Key": "k-1" } }), {
    sharedKey: "k-1",
    headerName: "x-pdl-key",
  });
  assert.equal(evs(out).length, 1);
  // The default header is not consulted once another name is configured.
  await assert.rejects(
    async () => await ingest(call(), { sharedKey: KEY, headerName: "x-pdl-key" }),
    /header is missing/,
  );
});

test("an empty batch is a valid delivery", async () => {
  assert.deepEqual(evs(await ingest(call({ rawBody: "[ ]" }))), [{ pdlIds: [], count: 0 }]);
});

test("one flipped byte in the shared key is refused", async () => {
  await assert.rejects(
    async () => await ingest(call({ headers: { Authorization: "Bearer test-shared-keY" } })),
    /does not match/,
  );
});

test("a missing header is refused", async () => {
  await assert.rejects(async () => await ingest(call({ headers: {} })), /header is missing/);
});

test("an absent rawBody is refused even with a matching key", async () => {
  await assert.rejects(async () => await ingest(call({ rawBody: undefined })), /raw body/);
});

test("an unset, empty or non-string shared key is refused, even against an empty header", async () => {
  for (const sharedKey of [undefined, "", 5]) {
    await assert.rejects(
      async () => await ingest(call({ headers: { Authorization: "" } }), { sharedKey }),
      /secret/,
    );
  }
  await assert.rejects(async () => await ingest(call(), null), /secret/);
});

test("an invalid configured header name is refused", async () => {
  await assert.rejects(
    async () => await ingest(call(), { sharedKey: KEY, headerName: "bad name\r\n" }),
    /header name is invalid/,
  );
});

test("a non-POST call and a body that is not an id array are refused", async () => {
  await assert.rejects(async () => await ingest(call({ method: "GET" })), /POST/);
  for (const rawBody of ["not json", "{}", '["a", 5]', '[""]', "null"]) {
    await assert.rejects(
      async () => await ingest(call({ rawBody })),
      /Not a People Data Labs webhook delivery/,
    );
  }
});

test("a refusal never echoes the key, the header value or the body", async () => {
  for (
    const raw of [
      call({ headers: { Authorization: "Bearer wrong-value-xyz" } }),
      call({ headers: {} }),
      call({ rawBody: undefined }),
    ]
  ) {
    try {
      await ingest(raw);
      assert.fail("expected a refusal");
    } catch (err) {
      const m = (err as Error).message;
      assert.ok(
        !m.includes("test-shared-key") && !m.includes("wrong-value-xyz") && !m.includes("9adnit66"),
        m,
      );
    }
  }
});
