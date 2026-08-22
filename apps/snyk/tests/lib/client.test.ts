import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_URL,
  compact,
  csv,
  cursorFromNext,
  DEFAULT_VERSION,
  json,
  resolveOrg,
  resolveVersion,
  SnykClient,
} from "../../lib/client.ts";

const display = { orgId: "org-1" };

/**
 * Snyk's API is date-versioned and `version` is required on 253 of its 290
 * operations, so the client stamps it on every request from one place.
 */
Deno.test("client: every request carries the pinned version", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], { display });
  await new SnykClient(ctx).request("/self");
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, `${API_URL}/self`);
  assertEquals(url.searchParams.get("version"), DEFAULT_VERSION);
});

Deno.test("client: a connection can pin a different version deliberately", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], {
    display: { ...display, apiVersion: "2024-10-15" },
  });
  await new SnykClient(ctx).request("/self");
  assertEquals(new URL(calls[0].url).searchParams.get("version"), "2024-10-15");
});

Deno.test("resolveVersion: falls back to the app's pinned default", () => {
  assertEquals(resolveVersion(undefined), DEFAULT_VERSION);
  assertEquals(resolveVersion({ display: {} } as never), DEFAULT_VERSION);
  assertEquals(resolveVersion({ display: { apiVersion: "2025-09-17" } } as never), "2025-09-17");
});

Deno.test("resolveOrg: the action's override wins, and neither is a directive error", () => {
  assertEquals(resolveOrg({ display: { orgId: "a" } } as never), "a");
  assertEquals(resolveOrg({ display: { orgId: "a" } } as never, "b"), "b");
  const err = assertThrows(() => resolveOrg({ display: {} } as never), Error);
  assert(err.message.includes("orgId"), err.message);
});

Deno.test("compact / csv / json behave as the actions expect", () => {
  assertEquals(compact({ a: 1, b: undefined, c: "", d: false, e: [] }), { a: 1, d: false });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv([]), undefined);
  assertEquals(json('{"a":1}', "tags"), { a: 1 });
  const bad = assertThrows(() => json("{oops", "tags"), Error);
  assert(bad.message.includes("tags"), bad.message);
});

/** JSON:API declares `links.next` as oneOf a string or an object with href. */
Deno.test("cursorFromNext: handles both link shapes and relative hrefs", () => {
  assertEquals(
    cursorFromNext("/rest/orgs/o1/issues?version=2026-03-25&starting_after=abc"),
    "abc",
  );
  assertEquals(
    cursorFromNext({ href: "https://api.snyk.io/rest/orgs/o1/issues?starting_after=xyz" }),
    "xyz",
  );
  assertEquals(cursorFromNext(undefined), undefined);
  assertEquals(cursorFromNext("/rest/orgs/o1/issues"), undefined);
});

Deno.test("client: uses the JSON:API media type on both sides", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new SnykClient(ctx).request("/orgs/o1/projects/p1", {
    method: "PATCH",
    body: { data: {} },
  });
  assertEquals(calls[0].headers["accept"], "application/vnd.api+json");
  // Snyk rejects a plain application/json body on its write endpoints.
  assertEquals(calls[0].headers["content-type"], "application/vnd.api+json");
});

Deno.test("client: never sends an Authorization header — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new SnykClient(ctx).request("/self");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: a failure surfaces the status and Snyk's JSON:API error body", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: { jsonapi: { version: "1.0" }, errors: [{ status: "400", detail: "bad version" }] },
  }], { display });
  const err = await assertRejects(
    async () => await new SnykClient(ctx).request("/self"),
    Error,
  );
  assert(err.message.includes("400"), err.message);
  assert(err.message.includes("bad version"), err.message);
});

Deno.test("client: requestAll follows links.next until it is absent", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        data: [{ id: "i1" }],
        links: { next: "/rest/orgs/o1/issues?version=2026-03-25&starting_after=c2" },
      },
    },
    { status: 200, body: { data: [{ id: "i2" }], links: {} } },
  ], { display });

  const items = await new SnykClient(ctx).requestAll("/orgs/o1/issues");
  assertEquals(items, [{ id: "i1" }, { id: "i2" }]);
  assertEquals(new URL(calls[0].url).searchParams.get("starting_after"), null);
  assertEquals(new URL(calls[0].url).searchParams.get("limit"), "100");
  assertEquals(new URL(calls[1].url).searchParams.get("starting_after"), "c2");
  // The version rides on the follow-up page too.
  assertEquals(new URL(calls[1].url).searchParams.get("version"), DEFAULT_VERSION);
});

Deno.test("client: requestAll stops at wantTotal even with a next page waiting", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: {
        data: [{ id: "1" }, { id: "2" }, { id: "3" }],
        links: { next: "/x?starting_after=c" },
      },
    },
  ], { display });
  assertEquals(await new SnykClient(ctx).requestAll("/orgs/o1/issues", {}, 2), [
    { id: "1" },
    { id: "2" },
  ]);
  assertEquals(calls.length, 1);
});

Deno.test("client: array query values repeat the key", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new SnykClient(ctx).request("/orgs/o1/issues", {
    query: { effective_severity_level: ["critical", "high"], type: "" },
  });
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("effective_severity_level"), ["critical", "high"]);
  assertEquals(q.get("type"), null);
});
