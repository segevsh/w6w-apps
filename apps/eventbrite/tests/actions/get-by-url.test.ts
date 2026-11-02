import { test } from "node:test";
import type { HookContext, SignableRequest } from "@w6w/types";
import { assert, assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-by-url.ts";
import personalToken from "../../auth/personal-token.ts";
import oauth2 from "../../auth/oauth2.ts";
import { ResourceUrlError } from "../../lib/resource-url.ts";

const API = "https://www.eventbriteapi.com/v3";

const CASES: Array<[string, string]> = [
  [`${API}/events/1000000001/`, "event"],
  [`${API}/orders/1000000003/`, "order"],
  [`${API}/events/1000000001/attendees/1000000004/`, "attendee"],
  [`${API}/events/1000000001/ticket_classes/1000000005/`, "ticket_class"],
  [`${API}/venues/1000000009/`, "venue"],
  [`${API}/organizers/1000000008/`, "organizer"],
  [`${API}/organizations/1000000002/`, "organization"],
  [`${API}/discounts/1000000011/`, "discount"],
  [`${API}/categories/103/`, "category"],
  [`${API}/media/1000000010/`, "media"],
  [`${API}/users/me/`, "user"],
  [`${API}/events/1000000001/description/`, "description"],
];

for (const [url, type] of CASES) {
  test(`get-by-url: ${type} — GETs the URL and returns the record with resource_type`, async () => {
    const body = { id: "1000000001", resource_uri: url, name: "Synthetic" };
    const { ctx, calls } = mockCtx([{ body }]);
    const result = await action.execute!({ url }, ctx);
    assertEquals(calls.length, 1);
    assertEquals(calls[0].method, "GET");
    assertEquals(calls[0].url, url);
    assertEquals(result, { ...body, resource_type: type });
  });
}

test("get-by-url: a URL without the trailing slash is fetched as given", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  const result = await action.execute!({ url: `${API}/orders/1` }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, `${API}/orders/1`);
  assertEquals(result.resource_type, "order");
});

test("get-by-url: surrounding whitespace from a template is trimmed", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await action.execute!({ url: `  ${API}/orders/1/\n` }, ctx);
  assertEquals(calls[0].url, `${API}/orders/1/`);
});

test("get-by-url: expand is normalized and sent as ?expand=", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await action.execute!({ url: `${API}/orders/1/`, expand: " attendees, event ,," }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/orders/1/");
  assertEquals(url.searchParams.get("expand"), "attendees,event");
});

test("get-by-url: expand replaces one already on the URL; without it the URL's own stays", async () => {
  const a = mockCtx([{ body: { id: "1" } }]);
  await action.execute!({ url: `${API}/events/1/?expand=venue`, expand: "organizer" }, a.ctx);
  assertEquals(new URL(a.calls[0].url).searchParams.getAll("expand"), ["organizer"]);

  const b = mockCtx([{ body: { id: "1" } }]);
  await action.execute!({ url: `${API}/events/1/?expand=venue`, expand: "" }, b.ctx);
  assertEquals(new URL(b.calls[0].url).searchParams.get("expand"), "venue");
});

test("get-by-url: an expand value with odd characters is refused before any fetch", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => action.execute!({ url: `${API}/orders/1/`, expand: "venue&token=x" }, ctx),
    ResourceUrlError,
  );
  assertEquals(calls.length, 0);
});

test("get-by-url: a URL fragment is dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await action.execute!({ url: `${API}/orders/1/#frag` }, ctx);
  assertEquals(calls[0].url, `${API}/orders/1/`);
});

test("get-by-url: an Eventbrite error surfaces with its status", async () => {
  const { ctx } = mockCtx([{ status: 404, statusText: "Not Found", body: { error: "NOT_FOUND" } }]);
  await assertRejects(() => action.execute!({ url: `${API}/orders/1/` }, ctx), Error, "404");
});

const REJECTED: Array<[string, unknown]> = [
  ["missing", undefined],
  ["empty", ""],
  ["not a string", 42],
  ["not a URL", "orders/1"],
  ["plain http", "http://www.eventbriteapi.com/v3/orders/1/"],
  ["another scheme", "ftp://www.eventbriteapi.com/v3/orders/1/"],
  ["another host", "https://evil.example.com/v3/orders/1/"],
  ["a look-alike host", "https://www.eventbriteapi.com.evil.example.com/v3/orders/1/"],
  ["a subdomain", "https://api.www.eventbriteapi.com/v3/orders/1/"],
  ["the bare domain", "https://eventbriteapi.com/v3/orders/1/"],
  ["the website host", "https://www.eventbrite.com/v3/orders/1/"],
  ["a non-default port", "https://www.eventbriteapi.com:8443/v3/orders/1/"],
  ["userinfo", "https://user:pass@www.eventbriteapi.com/v3/orders/1/"],
  ["username only", "https://token@www.eventbriteapi.com/v3/orders/1/"],
  ["userinfo hiding the host", "https://www.eventbriteapi.com@evil.example.com/v3/orders/1/"],
  ["another API version", "https://www.eventbriteapi.com/v2/orders/1/"],
  ["the API root", "https://www.eventbriteapi.com/v3/"],
  ["a prefix look-alike", "https://www.eventbriteapi.com/v30/orders/1/"],
  ["the host root", "https://www.eventbriteapi.com/"],
  ["traversal out of v3", "https://www.eventbriteapi.com/v3/../admin/"],
  ["traversal inside v3", "https://www.eventbriteapi.com/v3/orders/../users/me/"],
  ["a dot segment", "https://www.eventbriteapi.com/v3/./orders/1/"],
  ["encoded traversal", "https://www.eventbriteapi.com/v3/%2e%2e/admin/"],
  ["encoded slash", "https://www.eventbriteapi.com/v3/orders%2F1/"],
  ["backslash", "https://www.eventbriteapi.com\\@evil.example.com/v3/orders/1/"],
  ["embedded newline", "https://www.eventbriteapi.com/v3/or\nders/1/"],
  ["embedded tab", "https://www.eventbriteapi.com/v3/orders/\t1/"],
  ["odd segment characters", "https://www.eventbriteapi.com/v3/orders/1;x=y/"],
  ["protocol-relative", "//www.eventbriteapi.com/v3/orders/1/"],
];

for (const [why, url] of REJECTED) {
  test(`get-by-url: refuses ${why} without fetching`, async () => {
    const { ctx, calls } = mockCtx();
    await assertRejects(() => action.execute!({ url: url as string }, ctx), ResourceUrlError);
    assertEquals(calls.length, 0);
  });
}

/** `ctx.fetch` the way the runtime wires it: the connection's auth `sign` runs first. */
function signedCtx(
  sign: NonNullable<typeof personalToken.sign>,
  credential: Record<string, unknown>,
  inner: HookContext,
): HookContext {
  return {
    ...inner,
    fetch: (async (input: string, init?: RequestInit) => {
      const request: SignableRequest = {
        url: input,
        method: (init?.method ?? "GET") as SignableRequest["method"],
        headers: { ...(init?.headers as Record<string, string> | undefined) },
      };
      const signed = await sign({ request, credential }, inner);
      return inner.fetch(signed.url, { method: signed.method, headers: signed.headers });
    }) as unknown as typeof fetch,
  };
}

test("get-by-url: sets no authorization itself, so the connection's auth signs it", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await action.execute!({ url: `${API}/orders/1/` }, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});

test("get-by-url: the request carries the personal-token bearer header", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await action.execute!(
    { url: `${API}/orders/1/` },
    signedCtx(personalToken.sign!, { token: "priv-synthetic" }, ctx),
  );
  assertEquals(calls[0].headers["authorization"], "Bearer priv-synthetic");
  assertEquals(calls[0].url, `${API}/orders/1/`);
});

test("get-by-url: the request carries the oauth2 bearer header", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1" } }]);
  await action.execute!(
    { url: `${API}/events/1/` },
    signedCtx(oauth2.sign!, { accessToken: "oauth-synthetic" }, ctx),
  );
  assertEquals(calls[0].headers["authorization"], "Bearer oauth-synthetic");
});

test("get-by-url: declares output and a sample whose keys match it", () => {
  const output = action.output as Array<{ key: string }>;
  assert(Array.isArray(output));
  assertEquals(output.map((f) => f.key).sort(), Object.keys(action.sample!).sort());
  assertEquals((action.sample as Record<string, unknown>).resource_type, "order");
});
