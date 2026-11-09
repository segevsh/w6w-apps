import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import fileUpdated from "../../triggers/file-updated.ts";
import fileDeleted from "../../triggers/file-deleted.ts";
import fileVersionCreated from "../../triggers/file-version-created.ts";
import commentAdded from "../../triggers/comment-added.ts";
import libraryPublished from "../../triggers/library-published.ts";

const PASSCODE = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const callbackUrl = "https://hooks.example.test/figma/sub_1";
const state = {
  webhookId: "22",
  passcode: PASSCODE,
  eventType: "FILE_COMMENT",
  context: "file",
  contextId: "CL06nJNn5eZLQKDoARMND5",
};

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);

// Non-canonical whitespace: JSON.stringify(JSON.parse(raw)) !== raw.
const delivery = (over: Record<string, unknown> = {}) =>
  `{ "event_type" : "FILE_COMMENT",\n  "file_key":"CL06nJNn5eZLQKDoARMND5" , "file_name" : "Demo",
  "comment" : [ { "text" : "Looks good" } ], "comment_id": "5001", "mentions": [],
  "passcode" : ${JSON.stringify(over.passcode ?? PASSCODE)}, "timestamp": "2026-11-09T12:00:00Z",
  "triggered_by": { "id": "1", "handle": "Ada" }, "webhook_id": "22" }`;
assertEquals(JSON.stringify(JSON.parse(delivery())) !== delivery(), true);

const ingest = async (
  trigger: typeof commentAdded,
  over: { rawBody?: string | undefined; state?: unknown } = {},
) =>
  await trigger.handleIngest!({
    raw: {
      method: "POST",
      path: "",
      query: {},
      headers: {},
      body: null,
      ...("rawBody" in over ? { rawBody: over.rawBody } : { rawBody: delivery() }),
    },
    params: {},
    state: ("state" in over ? over.state : state) as typeof state,
    subscriptionId: "sub",
  }, mockCtx().ctx);

test("figma: a delivery carrying the stored passcode becomes one event, without the passcode", async () => {
  const events = evs(await ingest(commentAdded));
  assertEquals(events, [{
    eventType: "FILE_COMMENT",
    webhookId: "22",
    fileKey: "CL06nJNn5eZLQKDoARMND5",
    fileName: "Demo",
    timestamp: "2026-11-09T12:00:00Z",
    triggeredBy: { id: "1", handle: "Ada" },
    data: { comment: [{ text: "Looks good" }], comment_id: "5001", mentions: [] },
  }]);
  assertEquals(JSON.stringify(events).includes(PASSCODE), false);
});

test("figma: a wrong passcode (one flipped byte, empty, absent) is refused and never echoed", async () => {
  const flipped = (PASSCODE[0] === "0" ? "1" : "0") + PASSCODE.slice(1);
  for (const passcode of [flipped, PASSCODE + "0", "", "wrong"]) {
    const err = await assertRejects(() =>
      ingest(commentAdded, { rawBody: delivery({ passcode }) })
    );
    assertEquals(err.message.includes(PASSCODE), false);
    assertEquals(err.message.includes(flipped), false);
  }
  const noPasscode = delivery().replace(/"passcode" : "[0-9a-f]+",/, "");
  assertEquals(noPasscode.includes("passcode"), false);
  await assertRejects(() => ingest(commentAdded, { rawBody: noPasscode }));
});

test("figma: an absent raw body, a non-JSON body or a non-object body is refused", async () => {
  const err = await assertRejects(() => ingest(commentAdded, { rawBody: undefined }));
  assertEquals(err.message.includes("raw body"), true);
  await assertRejects(() => ingest(commentAdded, { rawBody: "not json" }));
  await assertRejects(() => ingest(commentAdded, { rawBody: "[1,2]" }));
});

test("figma: an unset or empty stored passcode refuses even a delivery with an empty passcode", async () => {
  for (const s of [undefined, {}, { ...state, passcode: "" }, { ...state, passcode: undefined }]) {
    const err = await assertRejects(() =>
      ingest(commentAdded, { state: s, rawBody: delivery({ passcode: "" }) })
    );
    assertEquals(err.message.includes("secret"), true);
  }
});

test("figma: a PING and an event of another type are acknowledged without an event", async () => {
  const ping = delivery().replace('"FILE_COMMENT"', '"PING"');
  assertEquals(evs(await ingest(commentAdded, { rawBody: ping })), []);
  assertEquals(evs(await ingest(fileUpdated)), []);
  assertEquals(evs(await ingest(libraryPublished)), []);
});

test("figma: onSubscribe registers a random passcode, replaces leftovers, and stores the passcode it sent", async () => {
  const m = mockCtx([
    {
      body: {
        webhooks: [{ id: "9", endpoint: callbackUrl }, { id: "10", endpoint: "https://x.test" }],
      },
    },
    { status: 204 },
    { body: { id: "22", event_type: "FILE_COMMENT" } },
  ]);
  const got = await commentAdded.onSubscribe!(
    {
      params: { context: "file", contextId: "CL06nJNn5eZLQKDoARMND5" },
      callbackUrl,
      subscriptionId: "sub",
      hostUrl: "https://h",
    },
    m.ctx,
  );
  assertEquals(m.calls.map((c) => [c.method, c.url]), [
    ["GET", "https://api.figma.com/v2/webhooks?context=file&context_id=CL06nJNn5eZLQKDoARMND5"],
    ["DELETE", "https://api.figma.com/v2/webhooks/9"],
    ["POST", "https://api.figma.com/v2/webhooks"],
  ]);
  const sent = JSON.parse(m.calls[2].body!);
  assertEquals(/^[0-9a-f]{64}$/.test(sent.passcode), true);
  assertEquals(sent, {
    event_type: "FILE_COMMENT",
    context: "file",
    context_id: "CL06nJNn5eZLQKDoARMND5",
    endpoint: callbackUrl,
    passcode: sent.passcode,
    description: "w6w comment-added",
  });
  assertEquals(got, {
    webhookId: "22",
    passcode: sent.passcode,
    eventType: "FILE_COMMENT",
    context: "file",
    contextId: "CL06nJNn5eZLQKDoARMND5",
  });
});

test("figma: two subscriptions get different passcodes", async () => {
  const sub = async () =>
    (await fileUpdated.onSubscribe!(
      {
        params: { context: "team", contextId: "t1" },
        callbackUrl,
        subscriptionId: "s",
        hostUrl: "h",
      },
      mockCtx([{ body: { webhooks: [] } }, { body: { id: "1" } }]).ctx,
    )).passcode;
  assertEquals((await sub()) !== (await sub()), true);
});

test("figma: onSubscribe rejects a missing id or unknown context before any vendor call", async () => {
  for (const params of [{ context: "file" }, { context: "folder", contextId: "x" }]) {
    const m = mockCtx();
    await assertRejects(() =>
      fileUpdated.onSubscribe!(
        { params, callbackUrl, subscriptionId: "s", hostUrl: "h" },
        m.ctx,
      )
    );
    assertEquals(m.calls.length, 0);
  }
});

test("figma: onUnsubscribe deletes the webhook and treats 404/410 as already gone", async () => {
  const m = mockCtx([{ status: 204 }]);
  await commentAdded.onUnsubscribe!({ params: {}, state, subscriptionId: "sub" }, m.ctx);
  assertEquals(m.calls.map((c) => [c.method, c.url]), [[
    "DELETE",
    "https://api.figma.com/v2/webhooks/22",
  ]]);
  for (const status of [404, 410]) {
    await commentAdded.onUnsubscribe!(
      { params: {}, state, subscriptionId: "sub" },
      mockCtx([{ status, body: { err: "gone" } }]).ctx,
    );
  }
  await assertRejects(() =>
    commentAdded.onUnsubscribe!(
      { params: {}, state, subscriptionId: "sub" },
      mockCtx([{ status: 500, body: {} }]).ctx,
    )
  );
});

test("figma: every trigger declares output and a sample", () => {
  for (const t of [fileUpdated, fileDeleted, fileVersionCreated, commentAdded, libraryPublished]) {
    assertEquals(Array.isArray(t.output) && t.output.length > 0, true);
    assertEquals(t.sample !== undefined, true);
  }
});
