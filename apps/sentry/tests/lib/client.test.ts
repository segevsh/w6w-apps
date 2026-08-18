import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  DEFAULT_ENDPOINT,
  nextCursor,
  resolveBaseUrl,
  resolveOrg,
  SentryClient,
} from "../../lib/client.ts";

Deno.test("resolveBaseUrl: falls back to the US region host and trims trailing slashes", () => {
  assertEquals(resolveBaseUrl(undefined), DEFAULT_ENDPOINT);
  assertEquals(resolveBaseUrl({}), DEFAULT_ENDPOINT);
  assertEquals(resolveBaseUrl({ endpoint: "https://de.sentry.io/" }), "https://de.sentry.io");
  assertEquals(
    resolveBaseUrl({ endpoint: "  https://sentry.example.com//  " }),
    "https://sentry.example.com",
  );
});

Deno.test("resolveOrg: the action's override wins over the connection's slug", () => {
  assertEquals(resolveOrg({ organizationSlug: "acme" }), "acme");
  assertEquals(resolveOrg({ organizationSlug: "acme" }, "other"), "other");
  // A blank override is not an override.
  assertEquals(resolveOrg({ organizationSlug: "acme" }, "   "), "acme");
});

Deno.test("resolveOrg: throws a directive error when neither side supplies one", () => {
  let message = "";
  try {
    resolveOrg({});
  } catch (e) {
    message = (e as Error).message;
  }
  assert(message.includes("organizationSlug"), `unhelpful message: ${message}`);
});

Deno.test("compact: drops unset keys but keeps false and zero", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: false, f: 0 }), {
    a: 1,
    e: false,
    f: 0,
  });
});

Deno.test("csv: splits, trims and drops blanks; blank input stays unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv("   "), undefined);
  assertEquals(csv(42), undefined);
});

Deno.test("nextCursor: follows rel=next only when results=true", () => {
  const link = '<https://us.sentry.io/api/0/organizations/?&cursor=0:0:1>; rel="previous"; ' +
    'results="false"; cursor="0:0:1", ' +
    '<https://us.sentry.io/api/0/organizations/?&cursor=0:100:0>; rel="next"; ' +
    'results="true"; cursor="0:100:0"';
  assertEquals(nextCursor(link), "0:100:0");
});

Deno.test("nextCursor: results=false on the next link ends pagination", () => {
  // Sentry ALWAYS emits a next cursor; `results` is the only thing that says
  // whether following it would return anything.
  const link = '<https://us.sentry.io/api/0/organizations/?&cursor=0:100:0>; rel="next"; ' +
    'results="false"; cursor="0:100:0"';
  assertEquals(nextCursor(link), undefined);
  assertEquals(nextCursor(null), undefined);
  assertEquals(nextCursor(""), undefined);
});

Deno.test("nextCursor: falls back to the cursor inside the URL", () => {
  const link = '<https://us.sentry.io/api/0/organizations/?&cursor=1:2:3>; rel="next"; ' +
    'results="true"';
  assertEquals(nextCursor(link), "1:2:3");
});

Deno.test("client: array query values repeat the key, and blanks are dropped", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], {
    display: { endpoint: "https://us.sentry.io", organizationSlug: "acme" },
  });
  const client = SentryClient.fromConnection(ctx);
  await client.request("/organizations/acme/issues/", {
    query: { project: ["1", "2"], query: "", statsPeriod: "24h" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.getAll("project"), ["1", "2"]);
  assertEquals(url.searchParams.get("query"), null);
  assertEquals(url.searchParams.get("statsPeriod"), "24h");
});

Deno.test("client: never sends an Authorization header — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], {
    display: { organizationSlug: "acme" },
  });
  await SentryClient.fromConnection(ctx).request("/organizations/acme/");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("client: a failure surfaces the status and Sentry's own body", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "You do not have permission" } }], {
    display: { organizationSlug: "acme" },
  });
  const client = SentryClient.fromConnection(ctx);
  const err = await assertRejects(() => client.request("/organizations/acme/"), Error);
  assert(err.message.includes("403"), err.message);
  assert(err.message.includes("You do not have permission"), err.message);
});

Deno.test("client: 204 and an empty body both come back as undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }, { status: 200, body: "" }], {
    display: { organizationSlug: "acme" },
  });
  const client = SentryClient.fromConnection(ctx);
  assertEquals(
    await client.request("/organizations/acme/issues/1/", { method: "DELETE" }),
    undefined,
  );
  assertEquals(await client.request("/organizations/acme/"), undefined);
});

Deno.test("client: requestAll follows the Link cursor until results=false", async () => {
  const next = (cursor: string) =>
    `<https://us.sentry.io/api/0/organizations/acme/issues/?cursor=${cursor}>; rel="next"; ` +
    `results="true"; cursor="${cursor}"`;
  const { ctx, calls } = mockCtx([
    { status: 200, body: [{ id: "1" }], headers: { link: next("0:100:0") } },
    { status: 200, body: [{ id: "2" }], headers: { link: 'rel="next"; results="false"' } },
  ], { display: { organizationSlug: "acme" } });

  const client = SentryClient.fromConnection(ctx);
  const items = await client.requestAll("/organizations/acme/issues/");
  assertEquals(items, [{ id: "1" }, { id: "2" }]);
  assertEquals(calls.length, 2);
  assertEquals(new URL(calls[0].url).searchParams.get("per_page"), "100");
  assertEquals(new URL(calls[0].url).searchParams.get("cursor"), null);
  assertEquals(new URL(calls[1].url).searchParams.get("cursor"), "0:100:0");
});

Deno.test("client: requestAll stops at wantTotal even with a next page waiting", async () => {
  const { ctx, calls } = mockCtx([
    {
      status: 200,
      body: [{ id: "1" }, { id: "2" }, { id: "3" }],
      headers: { link: '<https://x/?cursor=1:1:1>; rel="next"; results="true"; cursor="1:1:1"' },
    },
  ], { display: { organizationSlug: "acme" } });

  const items = await SentryClient.fromConnection(ctx).requestAll(
    "/organizations/acme/issues/",
    {},
    2,
  );
  assertEquals(items, [{ id: "1" }, { id: "2" }]);
  assertEquals(calls.length, 1);
});
