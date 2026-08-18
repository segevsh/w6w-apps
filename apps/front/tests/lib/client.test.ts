import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { compact, csv, FrontClient, json, tokenFromNext, unixSeconds } from "../../lib/client.ts";

Deno.test("client: the `q` filter is bracket notation, one repeated key per array item", () => {
  const { ctx } = mockCtx();
  const url = new FrontClient(ctx).url("/conversations", {
    q: { statuses: ["assigned", "unassigned"], updated_after: 1700000000 },
  });
  // Front reads `q[statuses]=a&q[statuses]=b` — NOT a JSON-encoded string.
  assertEquals(url.searchParams.getAll("q[statuses]"), ["assigned", "unassigned"]);
  assertEquals(url.searchParams.get("q[updated_after]"), "1700000000");
  assert(!url.search.includes("%7B"), `no JSON object should be encoded: ${url.search}`);
});

Deno.test("client: empty `q` entries are dropped rather than sent blank", () => {
  const { ctx } = mockCtx();
  const url = new FrontClient(ctx).url("/conversations", { q: { statuses: [], q2: "" } });
  assertEquals(url.search, "");
});

Deno.test("client: paging carries only the page_token, not Front's own hostname", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        _results: [{ id: "cnv_1" }],
        // Front builds this against the COMPANY host, not api2.
        _pagination: { next: "https://acme.api.frontapp.com/conversations?page_token=tok2" },
      },
    },
    { status: 200, body: { _results: [{ id: "cnv_2" }], _pagination: { next: null } } },
  ]);

  const all = await new FrontClient(ctx).requestAll("/conversations");
  assertEquals(all, [{ id: "cnv_1" }, { id: "cnv_2" }]);
  // Both requests go to the allowlisted host; only the cursor was reused.
  assertEquals(new URL(calls[1].url).host, "api2.frontapp.com");
  assertEquals(new URL(calls[1].url).searchParams.get("page_token"), "tok2");
});

Deno.test("client: a next link without a page_token stops paging instead of looping", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { _results: [{ id: "a" }], _pagination: { next: "not a url" } } },
  ]);
  assertEquals(await new FrontClient(ctx).requestAll("/conversations"), [{ id: "a" }]);
  assertEquals(calls.length, 1);
});

Deno.test("client: a collection with no _pagination is fetched once and sliced", async () => {
  // tags, statuses, inboxes, channels, teammates and comments have no cursor.
  const { ctx, calls } = mockCtx([
    { status: 200, body: { _results: [{ id: "t1" }, { id: "t2" }, { id: "t3" }] } },
  ]);
  assertEquals(await new FrontClient(ctx).requestAll("/company/tags", {}, 2), [
    { id: "t1" },
    { id: "t2" },
  ]);
  assertEquals(calls.length, 1);
});

Deno.test("client: page size is capped at Front's maximum of 100", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { _results: [] } }]);
  await new FrontClient(ctx).requestAll("/conversations", {}, 5000);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "100");
});

Deno.test("client: an error surfaces Front's _error title, message and details", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      _error: {
        status: 422,
        title: "Bad request",
        message: "Body did not satisfy requirements",
        details: ["body is required"],
      },
    },
  }]);
  const err = await assertRejects(async () => await new FrontClient(ctx).request("/conversations"));
  const text = String(err);
  assert(text.includes("Bad request"), text);
  assert(text.includes("Body did not satisfy requirements"), text);
  assert(text.includes("body is required"), text);
});

Deno.test("client: 204 answers with no body do not blow up JSON parsing", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(
    await new FrontClient(ctx).request("/conversations/cnv_1", { method: "PATCH" }),
    undefined,
  );
});

Deno.test("unixSeconds: ISO in, SECONDS out — not milliseconds", () => {
  assertEquals(unixSeconds("2026-01-01T00:00:00Z", "x"), 1767225600);
  assertEquals(unixSeconds(1767225600, "x"), 1767225600);
  assertEquals(unixSeconds("1767225600", "x"), 1767225600);
  assertEquals(unixSeconds("", "x"), undefined);
  assertThrows(() => unixSeconds("not a date", "dueAt"), Error, "dueAt");
});

Deno.test("csv / compact / json behave as the actions assume", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(compact({ a: 1, b: "", c: null, d: [], e: "x" }), { a: 1, e: "x" });
  assertEquals(json('{"a":1}', "f"), { a: 1 });
  assertThrows(() => json("{oops", "customFields"), Error, "customFields");
});

Deno.test("tokenFromNext: reads the cursor, tolerates rubbish", () => {
  assertEquals(tokenFromNext("https://x.api.frontapp.com/c?page_token=abc"), "abc");
  assertEquals(tokenFromNext("https://x.api.frontapp.com/c"), undefined);
  assertEquals(tokenFromNext(""), undefined);
});
