import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  compact,
  errorCode,
  errorText,
  formatError,
  parseJsonParam,
  RocketReachClient,
  toList,
  truncate,
} from "../../lib/client.ts";
import { bulkBody, lookupQuery, parseIds, profileOutput, statusOutput } from "../../lib/profile.ts";
import { normalizeSearch, PERSON_FILTERS, searchBody } from "../../lib/search.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: errorText reads detail, message, error or the raw text", () => {
  assertEquals(
    errorText('{"detail":"Invalid API key","error_code":"authentication_failed"}'),
    "Invalid API key",
  );
  assertEquals(errorText('{"status":401,"message":"Invalid API Key"}'), "Invalid API Key");
  assertEquals(errorText('{"error":"x"}'), "x");
  assertEquals(errorText("plain"), "plain");
  assertEquals(errorText("  "), "");
});

Deno.test("client: errorCode reads a string or numeric error_code", () => {
  assertEquals(errorCode('{"error_code":"authentication_failed"}'), "authentication_failed");
  assertEquals(errorCode('{"error_code":202}'), "202");
  assertEquals(errorCode("<html>"), undefined);
});

Deno.test("client: helpers", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: false }), { a: 1, e: false });
  assertEquals(truncate("x".repeat(10), 5).startsWith("xxxxx…"), true);
  assertEquals(toList(" a, b\nc ,,"), ["a", "b", "c"]);
  assertEquals(toList(["x", " y "]), ["x", "y"]);
  assertEquals(toList(undefined), []);
  assertEquals(parseJsonParam(' {"a":1} ', "x"), { a: 1 });
  assertEquals(parseJsonParam({ a: 1 }, "x"), { a: 1 });
  assertEquals(parseJsonParam("  ", "x"), undefined);
  assertThrows(() => parseJsonParam("{", "Queries"), Error, "Queries must be valid JSON");
});

Deno.test("client: formatError carries credit_type, the 429 Retry-After and a hint", () => {
  const e402 = formatError(
    402,
    "POST",
    "/x",
    JSON.stringify({ detail: "no credits", credit_type: "email_verification" }),
  );
  assertEquals(e402.includes("[credit_type email_verification]"), true);
  assertEquals(formatError(429, "GET", "/x", "", "7").includes("retry after 7s"), true);
  assertEquals(
    formatError(403, "GET", "/x", '{"detail":"d"}').includes("credits are exhausted"),
    true,
  );
});

Deno.test("client: sends no credential header, repeats array params and skips empties", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new RocketReachClient(ctx).request("/person/checkStatus", {
    query: { ids: [1, 2], skip: undefined, blank: "" },
  });
  assertEquals(calls[0].url, "https://api.rocketreach.co/api/v2/person/checkStatus?ids=1&ids=2");
  assertEquals(calls[0].headers["api-key"], undefined);
  assertEquals(calls[0].headers.authorization, undefined);
});

Deno.test("client: a 429 surfaces the vendor message and Retry-After; a 2xx text body is kept", async () => {
  const busy = mockCtx([{
    status: 429,
    headers: { "retry-after": "12" },
    body: { detail: "Too many" },
  }]);
  await assertRejects(
    () => new RocketReachClient(busy.ctx).request("/account/"),
    Error,
    "retry after 12s",
  );
  const text = mockCtx([{ body: "ok-text", headers: { "content-type": "text/plain" } }]);
  assertEquals((await new RocketReachClient(text.ctx).request("/x")).body, "ok-text");
  const empty = mockCtx([{ status: 204 }]);
  assertEquals((await new RocketReachClient(empty.ctx).request("/x")).body, undefined);
});

Deno.test("search: searchBody splits lists, merges the raw query over them, requires a filter", () => {
  const body = searchBody({
    current_title: "VP of Sales, Director",
    company_domain: "acme.com",
    query: '{"company_domain":["override.com"],"company_news_signal":["Funding"]}',
    start: 11,
    page_size: 25,
    order_by: "popularity",
  }, PERSON_FILTERS);
  assertEquals(body, {
    query: {
      current_title: ["VP of Sales", "Director"],
      company_domain: ["override.com"],
      company_news_signal: ["Funding"],
    },
    start: 11,
    page_size: 25,
    order_by: "popularity",
  });
  assertThrows(() => searchBody({}, PERSON_FILTERS), Error, "at least one search filter");
  assertThrows(() => searchBody({ query: "[1]" }, PERSON_FILTERS), Error, "JSON object");
});

Deno.test("search: normalizeSearch reads a bare array and the profiles+pagination shape", () => {
  const bare = normalizeSearch([{ id: 1 }, { id: 2 }], 1, 2);
  assertEquals([bare.count, bare.nextStart, bare.total], [2, 3, undefined]);
  const wrapped = normalizeSearch(
    { profiles: [{ id: 1 }], pagination: { next: 11, total: 40 } },
    1,
    10,
  );
  assertEquals([wrapped.count, wrapped.nextStart, wrapped.total], [1, 11, 40]);
  const last = normalizeSearch(
    { profiles: [{ id: 1 }], pagination: { next: 41, total: 40 } },
    31,
    10,
  );
  assertEquals(last.nextStart, undefined);
  assertEquals(normalizeSearch([{ id: 1 }], 1, 10).nextStart, undefined);
  assertEquals(normalizeSearch(null, 1, 10).count, 0);
  assertEquals(normalizeSearch(Array(100).fill({ id: 1 }), 9951, 100).nextStart, undefined);
});

Deno.test("profile: lookupQuery needs an identifying combination", () => {
  assertThrows(() => lookupQuery({ name: "A B" }), Error, "Identify the person");
  assertEquals(
    lookupQuery({ name: "A B", current_employer: "Acme", return_cached_emails: false }),
    {
      name: "A B",
      current_employer: "Acme",
      return_cached_emails: false,
    },
  );
  assertEquals(
    lookupQuery({ linkedin_url: "www.linkedin.com/in/x" }).linkedin_url,
    "www.linkedin.com/in/x",
  );
});

Deno.test("profile: profileOutput maps fields, complete flag and tolerates a bare body", () => {
  const out = profileOutput({
    id: 5,
    status: "complete",
    current_title: "CEO",
    emails: [{ email: "a@b.c" }],
  });
  assertEquals([out.id, out.complete, out.currentTitle], [5, true, "CEO"]);
  assertEquals(profileOutput({ id: 5, status: "searching" }).complete, false);
  assertEquals(profileOutput(undefined).emails, []);
});

Deno.test("profile: parseIds, statusOutput and bulkBody validate their input", () => {
  assertEquals(parseIds("5, 6", toList), [5, 6]);
  assertThrows(() => parseIds("", toList), Error, "at least one");
  assertThrows(() => parseIds("a", toList), Error, "positive integers");
  const s = statusOutput([{ id: 1, status: "complete" }, { id: 2, status: "searching" }, {
    id: 3,
    status: "failed",
  }]);
  assertEquals([s.count, s.pending, s.allComplete], [3, 1, false]);
  assertEquals(statusOutput({}).allComplete, false);
  assertThrows(() => bulkBody({ queries: "[]" }, parseJsonParam), Error, "1 to 100");
  assertThrows(() => bulkBody({ queries: [1] }, parseJsonParam), Error, "JSON object");
  assertEquals(bulkBody({ queries: [{ id: 1 }], webhook_id: 4 }, parseJsonParam).count, 1);
});
