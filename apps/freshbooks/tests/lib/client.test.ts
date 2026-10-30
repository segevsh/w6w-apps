import { test } from "node:test";
import { assertEquals, assertRejects, assertThrows } from "../_assert.ts";
import { mockFreshBooksCtx } from "../_helpers.ts";
import { compact, FreshBooksClient, jsonArray, jsonObject, unset } from "../../lib/client.ts";

test("unset: treats a blank string as absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});

test("compact: drops undefined, null and empty-string values", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: "x" }), { a: 1, e: "x" });
});

test("jsonObject: parses a JSON string and passes an object through", () => {
  assertEquals(jsonObject('{"a":1}', "fields"), { a: 1 });
  assertEquals(jsonObject({ a: 1 }, "fields"), { a: 1 });
  assertEquals(jsonObject(undefined, "fields"), {});
});

test("jsonObject: rejects a non-object", () => {
  assertThrows(() => jsonObject([1, 2], "fields"), Error, "must be a JSON object");
});

test("jsonArray: parses a JSON string and passes an array through", () => {
  assertEquals(jsonArray("[1,2]", "lines"), [1, 2]);
  assertEquals(jsonArray([1, 2], "lines"), [1, 2]);
  assertEquals(jsonArray(undefined, "lines"), []);
});

test("jsonArray: rejects a non-array", () => {
  assertThrows(() => jsonArray({ a: 1 }, "lines"), Error, "must be a JSON array");
});

test("FreshBooksClient: builds an accounting-domain request from the connection's accountId", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { response: { result: { clients: [] } } } }]);
  await new FreshBooksClient(ctx).request("accounting", "/users/clients", { query: { page: 1 } });
  assertEquals(
    calls[0].url,
    "https://api.freshbooks.com/accounting/account/acc1/users/clients?page=1",
  );
  assertEquals(calls[0].headers["authorization"], undefined);
});

test("FreshBooksClient: builds a timetracking-domain request from the connection's businessId", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { time_entries: [] } }]);
  await new FreshBooksClient(ctx).request("timetracking", "/time_entries");
  assertEquals(calls[0].url, "https://api.freshbooks.com/timetracking/business/biz1/time_entries");
});

test("FreshBooksClient: builds a projects-domain request from the connection's businessId", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { projects: [] } }]);
  await new FreshBooksClient(ctx).request("projects", "/projects");
  assertEquals(calls[0].url, "https://api.freshbooks.com/projects/business/biz1/projects");
});

test("FreshBooksClient: wraps search filters as search[name]=value", async () => {
  const { ctx, calls } = mockFreshBooksCtx([{ body: { response: { result: { clients: [] } } } }]);
  await new FreshBooksClient(ctx).request("accounting", "/users/clients", {
    search: { email: "a@b.com" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("search[email]"), "a@b.com");
});

test("FreshBooksClient: throws without an accountId for the accounting domain", async () => {
  const { ctx } = mockFreshBooksCtx([], {});
  await assertRejects(
    () => new FreshBooksClient(ctx).request("accounting", "/users/clients"),
    Error,
    "no account id",
  );
});

test("FreshBooksClient: throws without a businessId for the timetracking domain", async () => {
  const { ctx } = mockFreshBooksCtx([], {});
  await assertRejects(
    () => new FreshBooksClient(ctx).request("timetracking", "/time_entries"),
    Error,
    "no business id",
  );
});

test("FreshBooksClient: surfaces the accounting-domain response.errors messages on a non-ok response", async () => {
  const { ctx } = mockFreshBooksCtx([{
    status: 400,
    body: { response: { errors: [{ errno: 1001, field: "fname", message: "fname is required" }] } },
  }]);
  await assertRejects(
    () =>
      new FreshBooksClient(ctx).request("accounting", "/users/clients", {
        method: "POST",
        body: {},
      }),
    Error,
    "fname is required",
  );
});

test("FreshBooksClient: falls back to the raw body when the error is unshaped", async () => {
  const { ctx } = mockFreshBooksCtx([{ status: 404, body: "Not Found" }]);
  await assertRejects(
    () => new FreshBooksClient(ctx).request("timetracking", "/time_entries/999"),
    Error,
    "Not Found",
  );
});

test("FreshBooksClient: a body-less response resolves to undefined", async () => {
  const { ctx } = mockFreshBooksCtx([{ status: 200, body: undefined }]);
  const out = await new FreshBooksClient(ctx).request("accounting", "/users/clients/c1", {
    method: "DELETE",
  });
  assertEquals(out, undefined);
});
