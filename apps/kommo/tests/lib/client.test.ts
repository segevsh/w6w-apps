import { test } from "node:test";
import { assertEquals, assertRejects, assertThrows } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import {
  accountDomainFromConnection,
  compact,
  csv,
  errorMessage,
  jsonArray,
  KommoClient,
  normalizeAccountDomain,
  tagList,
} from "../../lib/client.ts";

test("normalizeAccountDomain: assumes .kommo.com for a bare subdomain", () => {
  assertEquals(normalizeAccountDomain("acme"), "acme.kommo.com");
});

test("normalizeAccountDomain: keeps a full .kommo.com host as-is", () => {
  assertEquals(normalizeAccountDomain("acme.kommo.com"), "acme.kommo.com");
});

test("normalizeAccountDomain: keeps the legacy .amocrm.com host as-is", () => {
  assertEquals(normalizeAccountDomain("acme.amocrm.com"), "acme.amocrm.com");
});

test("normalizeAccountDomain: strips a pasted scheme and path", () => {
  assertEquals(normalizeAccountDomain("https://acme.kommo.com/leads"), "acme.kommo.com");
});

test("normalizeAccountDomain: lowercases the host", () => {
  assertEquals(normalizeAccountDomain("ACME.Kommo.com"), "acme.kommo.com");
});

test("normalizeAccountDomain: rejects an empty address", () => {
  assertThrows(() => normalizeAccountDomain(""), Error, "empty");
});

test("normalizeAccountDomain: rejects a host on neither known apex", () => {
  assertThrows(() => normalizeAccountDomain("acme.example.com"), Error, "doesn't look like");
});

test("accountDomainFromConnection: reads the connection's accountDomain", () => {
  const { ctx } = mockCtx([], { display: { accountDomain: "acme.kommo.com" } });
  assertEquals(accountDomainFromConnection(ctx.connection), "acme.kommo.com");
});

test("accountDomainFromConnection: throws a reconnect message when there is none", () => {
  assertThrows(() => accountDomainFromConnection(undefined), Error, "records no account address");
});

test("compact: drops undefined, null, empty string and empty arrays", () => {
  assertEquals(
    compact({ a: 1, b: undefined, c: null, d: "", e: [], f: "x", g: [1] }),
    { a: 1, f: "x", g: [1] },
  );
});

test("csv: splits a comma-separated string and trims", () => {
  assertEquals(csv(" a, b ,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(undefined), undefined);
  assertEquals(csv(["x", " y "]), ["x", "y"]);
});

test("jsonArray: parses a JSON-string array", () => {
  assertEquals(jsonArray('[{"field_id":1}]'), [{ field_id: 1 }]);
});

test("jsonArray: passes an already-parsed array through", () => {
  assertEquals(jsonArray([{ a: 1 }]), [{ a: 1 }]);
});

test("jsonArray: treats an empty value as unset", () => {
  assertEquals(jsonArray(undefined), undefined);
  assertEquals(jsonArray(""), undefined);
  assertEquals(jsonArray([]), undefined);
});

test("jsonArray: rejects a non-array", () => {
  assertThrows(() => jsonArray('{"a":1}'), Error, "expected a JSON array");
});

test("tagList: turns comma-separated names into Kommo's [{name}] shape", () => {
  assertEquals(tagList("vip, lead"), [{ name: "vip" }, { name: "lead" }]);
  assertEquals(tagList(undefined), undefined);
});

test("errorMessage: reads the problem+json envelope {title, detail}", () => {
  const msg = errorMessage(JSON.stringify({
    title: "Unauthorized",
    type: "https://httpstatus.es/401",
    status: 401,
    detail: "Invalid user name or password",
  }));
  assertEquals(msg, "Unauthorized: Invalid user name or password");
});

test("errorMessage: folds validation-errors into the message", () => {
  const msg = errorMessage(JSON.stringify({
    title: "Bad Request",
    detail: "Request validation failed",
    "validation-errors": [
      { request_id: "0", errors: [{ path: "status_id", detail: "not a valid choice" }] },
    ],
  }));
  assertEquals(msg, "Bad Request: Request validation failed; status_id: not a valid choice");
});

test("errorMessage: falls back to the raw text when it is not JSON", () => {
  assertEquals(errorMessage("<html>nope</html>"), "<html>nope</html>");
  assertEquals(errorMessage(""), "");
});

const conn = { display: { accountDomain: "acme.kommo.com" } };

test("KommoClient.request: builds the URL under /api/v4 and forwards query params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }], conn);
  const client = new KommoClient(ctx);
  await client.request("/leads/1", { query: { with: "contacts", empty: undefined } });
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/leads/1?with=contacts");
});

test("KommoClient.request: throws a message carrying the problem+json envelope", async () => {
  const { ctx } = mockCtx(
    [{
      status: 401,
      statusText: "Unauthorized",
      body: { title: "Unauthorized", detail: "Invalid user name or password" },
    }],
    conn,
  );
  const client = new KommoClient(ctx);
  await assertRejects(
    () => client.request("/leads/1"),
    Error,
    "Kommo 401 Unauthorized for GET /api/v4/leads/1: Unauthorized: Invalid user name or password",
  );
});

test("KommoClient.request: treats a 204 as no body", async () => {
  const { ctx } = mockCtx([{ status: 204 }], conn);
  const client = new KommoClient(ctx);
  assertEquals(await client.request("/leads"), undefined);
});

test("KommoClient.requestPage: unwraps _embedded.<key> and reports hasMore", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { leads: [{ id: 1 }, { id: 2 }] } } }],
    conn,
  );
  const client = new KommoClient(ctx);
  const { items, page, hasMore } = await client.requestPage("/leads", "leads", { limit: 2 });
  assertEquals(items, [{ id: 1 }, { id: 2 }]);
  assertEquals(page, 1);
  assertEquals(hasMore, true);
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/leads?page=1&limit=2");
});

test("KommoClient.requestPage: a short page means no more", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { _embedded: { leads: [{ id: 1 }] } } }],
    conn,
  );
  const client = new KommoClient(ctx);
  const { hasMore } = await client.requestPage("/leads", "leads", { limit: 50 });
  assertEquals(hasMore, false);
});

test("KommoClient.requestPage: an empty collection is an empty array, not a throw", async () => {
  const { ctx } = mockCtx([{ status: 204 }], conn);
  const client = new KommoClient(ctx);
  const { items, hasMore } = await client.requestPage("/leads", "leads");
  assertEquals(items, []);
  assertEquals(hasMore, false);
});

test("KommoClient.createOne: wraps the body in an array and unwraps the echoed row", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: { _embedded: { leads: [{ id: 152462, request_id: "0" }] } },
    }],
    conn,
  );
  const client = new KommoClient(ctx);
  const created = await client.createOne("/leads", "leads", { name: "Example" });
  assertEquals(created, { id: 152462, request_id: "0" });
  assertEquals(JSON.parse(calls[0].body!), [{ name: "Example" }]);
});

test("KommoClient.createOne: throws when Kommo echoes back no row", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { _embedded: { leads: [] } } }], conn);
  const client = new KommoClient(ctx);
  await assertRejects(
    () => client.createOne("/leads", "leads", { name: "x" }),
    Error,
    "did not echo back a created leads row",
  );
});

test("KommoClient.updateOne: sends a plain object body and unwraps the envelope", async () => {
  const { ctx, calls } = mockCtx(
    [{
      status: 200,
      body: { _embedded: { leads: [{ id: 152464, updated_at: 1686732474 }] } },
    }],
    conn,
  );
  const client = new KommoClient(ctx);
  const updated = await client.updateOne("/leads/152464", "leads", { price: 12000 });
  assertEquals(updated, { id: 152464, updated_at: 1686732474 });
  assertEquals(calls[0].method, "PATCH");
  assertEquals(JSON.parse(calls[0].body!), { price: 12000 });
});
