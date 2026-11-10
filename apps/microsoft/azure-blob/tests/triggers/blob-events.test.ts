import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import app from "../../index.ts";
import blobCreated from "../../triggers/blob-created.ts";
import blobDeleted from "../../triggers/blob-deleted.ts";

const evs = (r: unknown) => (Array.isArray(r) ? r : (r as { events: unknown[] }).events);
const CALLBACK = "https://api.example.test/triggers/webhooks/sub_1";

const blobEvent = (type: string, container: string, name: string) =>
  `{ "topic" : "/subscriptions/s/resourceGroups/r/providers/Microsoft.Storage/storageAccounts/acct",
  "subject":"/blobServices/default/containers/${container}/blobs/${name}",  "eventType": "${type}",
  "eventTime":"2026-11-10T10:30:00.9584103Z", "id":"evt-${name}",
  "data": { "api":"PutBlockList", "contentType":"text/plain", "contentLength": 524288,
  "blobType":"BlockBlob", "eTag":"0x8D4", "url":"https://acct.blob.core.windows.net/${container}/${name}",
  "sequencer":"0042" }, "dataVersion":"", "metadataVersion":"1" }`;

// Non-canonical whitespace: JSON.stringify(JSON.parse(body)) !== body.
const BATCH = `[ ${blobEvent("Microsoft.Storage.BlobCreated", "photos", "dir/a b.png")},
  ${blobEvent("Microsoft.Storage.BlobDeleted", "photos", "old.png")},
  ${blobEvent("Microsoft.Storage.BlobCreated", "docs", "x.txt")} ]`;

const VALIDATION = `[ { "id":"2d1781af", "topic":"/subscriptions/s", "subject":"",
  "data": { "validationCode":"512d38b6-c7b8-40c8-89fe-f46f9e9622b6",
  "validationUrl":"https://rp.eventgrid.azure.net/validate?id=1" },
  "eventType":"Microsoft.EventGrid.SubscriptionValidationEvent",
  "eventTime":"2026-11-10T10:30:00Z", "metadataVersion":"1", "dataVersion":"2" } ]`;

const call = (
  rawBody: string | null,
  headers: Record<string, string> = { "aeg-event-type": "Notification" },
  params: Record<string, string> = {},
  method = "POST",
) => ({
  raw: {
    method,
    path: "/",
    query: {},
    headers,
    body: rawBody === null ? null : JSON.parse(rawBody),
    ...(rawBody === null ? {} : { rawBody }),
  },
  params,
  state: { callbackUrl: CALLBACK },
  subscriptionId: "sub_1",
});

type Trig = typeof blobCreated;
const run = (t: Trig, input: ReturnType<typeof call>) =>
  t.handleIngest!(input as never, mockCtx().ctx);

async function refused(fn: () => Promise<unknown>, includes: string) {
  try {
    await fn();
  } catch (err) {
    assert(err instanceof Error && err.message.includes(includes), `message: ${String(err)}`);
    return;
  }
  throw new Error("expected the delivery to be refused");
}

test("fixtures have non-canonical whitespace", () => {
  assert(JSON.stringify(JSON.parse(BATCH)) !== BATCH);
  assert(JSON.stringify(JSON.parse(VALIDATION)) !== VALIDATION);
});

test("app declares two webhook triggers with output and sample, no poll", () => {
  assertEquals(app.triggers.map((t) => t.key), ["blob-created", "blob-deleted"]);
  for (const t of app.triggers) {
    assert(t.output!.length > 0);
    assert(t.sample !== undefined);
    assertEquals(t.poll, undefined);
  }
});

test("manual webhook: onSubscribe makes no vendor call and returns the callback URL", async () => {
  const m = mockCtx([]);
  const state = await blobCreated.onSubscribe!(
    { params: {}, callbackUrl: CALLBACK, subscriptionId: "s" } as never,
    m.ctx,
  );
  assertEquals(state, { callbackUrl: CALLBACK });
  assertEquals(m.calls.length, 0);
});

test("a notification is parsed: each trigger gets only its own event type", async () => {
  const created = evs(await run(blobCreated, call(BATCH))) as Array<Record<string, unknown>>;
  assertEquals(created.map((e) => e.blobName), ["dir/a b.png", "x.txt"]);
  assertEquals(created[0].container, "photos");
  assertEquals(created[0].url, "https://acct.blob.core.windows.net/photos/dir/a b.png");
  assertEquals(created[0].contentLength, 524288);
  assertEquals(created[0].contentType, "text/plain");
  assertEquals(created[0].eventType, "Microsoft.Storage.BlobCreated");
  const deleted = evs(await run(blobDeleted, call(BATCH))) as Array<Record<string, unknown>>;
  assertEquals(deleted.map((e) => e.blobName), ["old.png"]);
});

test("the container param filters by the subject's container", async () => {
  const out = evs(await run(blobCreated, call(BATCH, undefined, { container: "docs" }))) as Array<
    Record<string, unknown>
  >;
  assertEquals(out.map((e) => e.blobName), ["x.txt"]);
});

test("validation handshake echoes the code in validationResponse and emits no event", async () => {
  const result = await run(
    blobCreated,
    call(VALIDATION, { "aeg-event-type": "SubscriptionValidation" }),
  );
  assertEquals(evs(result), []);
  const res =
    (result as { response: { status: number; headers: Record<string, string>; body: string } })
      .response;
  assertEquals(res.status, 200);
  assertEquals(res.headers, { "content-type": "application/json" });
  assertEquals(JSON.parse(res.body), {
    validationResponse: "512d38b6-c7b8-40c8-89fe-f46f9e9622b6",
  });
});

test("validation refused when the code is missing, malformed or the event is another type", async () => {
  const h = { "aeg-event-type": "SubscriptionValidation" };
  await refused(
    () =>
      run(
        blobCreated,
        call(
          `[ { "eventType": "Microsoft.EventGrid.SubscriptionValidationEvent", "data": {} } ]`,
          h,
        ),
      ),
    "validation code",
  );
  await refused(
    () =>
      run(
        blobCreated,
        call(
          VALIDATION.replace("512d38b6-c7b8-40c8-89fe-f46f9e9622b6", "<script>alert(1)</script>"),
          h,
        ),
      ),
    "validation code",
  );
  await refused(() => run(blobCreated, call(BATCH, h)), "validation code");
});

test("the subscription-name pin: matching name passes, another or missing is refused", async () => {
  const pin = { eventSubscriptionName: "My-Blob-Sub" };
  const ok = { "aeg-event-type": "Notification", "aeg-subscription-name": "my-blob-sub" };
  assertEquals((evs(await run(blobCreated, call(BATCH, ok, pin))) as unknown[]).length, 2);
  await refused(
    () => run(blobCreated, call(BATCH, { ...ok, "aeg-subscription-name": "other" }, pin)),
    "expected event subscription",
  );
  await refused(
    () => run(blobCreated, call(BATCH, { "aeg-event-type": "Notification" }, pin)),
    "expected event subscription",
  );
  await refused(
    () =>
      run(
        blobCreated,
        call(VALIDATION, {
          "aeg-event-type": "SubscriptionValidation",
          "aeg-subscription-name": "other",
        }, pin),
      ),
    "expected event subscription",
  );
});

test("SubscriptionDeletion is acknowledged with no event", async () => {
  assertEquals(
    evs(await run(blobCreated, call("[]", { "aeg-event-type": "SubscriptionDeletion" }))),
    [],
  );
});

test("missing or unknown aeg-event-type, rawBody absent, non-POST, non-array body → refused", async () => {
  await refused(() => run(blobCreated, call(BATCH, {})), "aeg-event-type");
  await refused(
    () => run(blobCreated, call(BATCH, { "aeg-event-type": "Other" })),
    "aeg-event-type",
  );
  await refused(() => run(blobCreated, call(null)), "raw body");
  await refused(() => run(blobCreated, call(BATCH, undefined, {}, "GET")), "POST");
  await refused(() => run(blobCreated, call(`{ "a": 1 }`)), "JSON array");
});
