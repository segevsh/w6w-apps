import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  apiBase,
  compact,
  parseJson,
  parseJsonOptional,
  QuickbaseClient,
  realmFromConnection,
  resolveAppId,
} from "../../lib/client.ts";
import type { RedactedConnection } from "@w6w/types";

const conn = (display: Record<string, unknown>) => ({ display } as unknown as RedactedConnection);

Deno.test("apiBase: defaults to the documented US host", () => {
  assertEquals(apiBase("acme.quickbase.com"), "https://api.quickbase.com/v1");
  assertEquals(apiBase(undefined), "https://api.quickbase.com/v1");
});

Deno.test("apiBase: routes .quickbase.eu realms to the EU host", () => {
  assertEquals(apiBase("acme.quickbase.eu"), "https://api.quickbase.eu/v1");
  assertEquals(apiBase("ACME.QUICKBASE.EU"), "https://api.quickbase.eu/v1");
});

Deno.test("apiBase: an unrecognised suffix falls back to US, never to a third host", () => {
  // quickbaserocks.com is a real Quickbase non-production suffix and is
  // deliberately NOT on the manifest allowlist.
  assertEquals(apiBase("acme.quickbaserocks.com"), "https://api.quickbase.com/v1");
  assertEquals(apiBase("not-a-hostname"), "https://api.quickbase.com/v1");
});

Deno.test("realmFromConnection: reads display, tolerates absence", () => {
  assertEquals(realmFromConnection(conn({ realm: "acme.quickbase.eu" })), "acme.quickbase.eu");
  assertEquals(realmFromConnection(conn({})), undefined);
  assertEquals(realmFromConnection(undefined), undefined);
});

Deno.test("resolveAppId: param overrides the connection default", () => {
  assertEquals(resolveAppId("bqrother", conn({ appId: "bqrdefault" })), "bqrother");
});

Deno.test("resolveAppId: falls back to the connection default", () => {
  assertEquals(resolveAppId(undefined, conn({ appId: "bqrdefault" })), "bqrdefault");
  assertEquals(resolveAppId("   ", conn({ appId: "bqrdefault" })), "bqrdefault");
});

Deno.test("resolveAppId: throws a directive error when neither is present", () => {
  const e = assertThrows(() => resolveAppId(undefined, conn({})));
  assert((e as Error).message.includes("appId"));
});

Deno.test("client: builds the versioned URL and sets no auth headers itself", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  await new QuickbaseClient(ctx).request("tables", { query: { appId: "bqrapp1" } });

  assertEquals(calls[0].url, "https://api.quickbase.com/v1/tables?appId=bqrapp1");
  // The credential reaches the wire only via the auth `sign` hook. If the client
  // ever set these itself it would have to hold the token.
  assert(!("authorization" in calls[0].headers));
  assert(!("qb-realm-hostname" in calls[0].headers));
});

Deno.test("client: picks the EU host from the connection's realm", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  (ctx as { connection?: unknown }).connection = { display: { realm: "acme.quickbase.eu" } };
  await new QuickbaseClient(ctx).request("apps/bqrapp1");

  assertEquals(new URL(calls[0].url).host, "api.quickbase.eu");
});

Deno.test("client: JSON-encodes a body and sets content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new QuickbaseClient(ctx).request("records", { method: "POST", body: { to: "bck1" } });

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { to: "bck1" });
});

Deno.test("client: drops unset query params rather than sending 'undefined'", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new QuickbaseClient(ctx).request("fields", {
    query: { tableId: "bck1", includeFieldPerms: undefined, skip: null, top: "" },
  });

  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("tableId"), "bck1");
  assert(!url.searchParams.has("includeFieldPerms"));
  assert(!url.searchParams.has("skip"));
  assert(!url.searchParams.has("top"));
});

Deno.test("client: surfaces Quickbase's message/description and the ray id", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    statusText: "Unauthorized",
    headers: { "content-type": "application/json", "qb-api-ray": "ray-123" },
    body: { message: "Access denied", description: "User token is invalid" },
  }]);

  const err = await assertRejects(
    () => new QuickbaseClient(ctx).request("apps/bqrapp1"),
    Error,
  );
  assert(err.message.includes("401"));
  assert(err.message.includes("Access denied: User token is invalid"));
  assert(err.message.includes("ray-123"));
});

Deno.test("client: a non-JSON error body is still reported", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    headers: { "content-type": "text/plain" },
    body: "Please visit https://developer.quickbase.com for more information.",
  }]);
  const err = await assertRejects(() => new QuickbaseClient(ctx).request("apps/x"), Error);
  assert(err.message.includes("developer.quickbase.com"));
});

Deno.test("client: 207 partial success is NOT thrown — it carries written rows", async () => {
  // 207 is a 2xx, so `res.ok` is true and the body must come back intact for
  // the action to inspect `lineErrors`.
  const { ctx } = mockCtx([{ status: 207, body: { metadata: { createdRecordIds: [11] } } }]);
  const out = await new QuickbaseClient(ctx).request<{ metadata: { createdRecordIds: number[] } }>(
    "records",
    { method: "POST", body: {} },
  );
  assertEquals(out.metadata.createdRecordIds, [11]);
});

Deno.test("compact: drops undefined, null and empty-string keys", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false }), { a: 1, e: false });
});

Deno.test("parseJson: accepts objects and strings, rejects blanks and bad JSON", () => {
  assertEquals(parseJson<number[]>([1, 2], "Field IDs"), [1, 2]);
  assertEquals(parseJson<number[]>("[1,2]", "Field IDs"), [1, 2]);
  assertThrows(() => parseJson("", "Field IDs"), Error, "required");
  assertThrows(() => parseJson("{nope", "Field IDs"), Error, "not valid JSON");
});

Deno.test("parseJsonOptional: a blank value is simply absent", () => {
  assertEquals(parseJsonOptional("", "Sort by"), undefined);
  assertEquals(parseJsonOptional(undefined, "Sort by"), undefined);
  assertEquals(parseJsonOptional<number[]>("[3]", "Sort by"), [3]);
});
