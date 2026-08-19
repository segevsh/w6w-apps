import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  assertCredential,
  compact,
  credentialKindOf,
  csv,
  DELIVERY_HOSTS,
  describeError,
  json,
  MANAGEMENT_HOSTS,
  query,
  rateLimitFor,
  regionOf,
  spaceIdOf,
  StoryblokClient,
  throughputFor,
  validateContent,
} from "../../lib/client.ts";

const DELIVERY = { display: { credentialKind: "delivery", region: "eu" } };
const MANAGEMENT = { display: { credentialKind: "management", region: "us", spaceId: "123" } };

/** Outside the EU both APIs share a host and differ only by path. */
Deno.test("hosts: the EU management host is the only one that differs", () => {
  assertEquals(DELIVERY_HOSTS.eu, "https://api.storyblok.com");
  assertEquals(MANAGEMENT_HOSTS.eu, "https://mapi.storyblok.com");
  for (const region of ["us", "ca", "ap"]) {
    assertEquals(DELIVERY_HOSTS[region], MANAGEMENT_HOSTS[region], region);
  }
});

Deno.test("delivery: builds the /v2/cdn path in the connection's region", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { stories: [], cv: 1 } }], DELIVERY);
  await new StoryblokClient(ctx).delivery("/stories");
  assertEquals(calls[0].url, "https://api.storyblok.com/v2/cdn/stories");
});

Deno.test("management: builds the /v1 path in the connection's region", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], MANAGEMENT);
  await new StoryblokClient(ctx).management("/spaces/123/stories");
  assertEquals(calls[0].url, "https://api-us.storyblok.com/v1/spaces/123/stories");
});

/** Storyblok reports paging in headers, not the body. */
Deno.test("delivery: reads total and per-page from the response headers", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { stories: [], cv: 1735645795 },
    headers: { total: "412", "per-page": "25" },
  }], DELIVERY);
  const result = await new StoryblokClient(ctx).delivery("/stories");
  assertEquals(result.total, 412);
  assertEquals(result.perPage, 25);
  assertEquals(result.cv, 1735645795);
});

Deno.test("client: never sets the credential — the auth hook does", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], DELIVERY);
  await new StoryblokClient(ctx).delivery("/stories");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(new URL(calls[0].url).searchParams.get("token"), null);
});

Deno.test("regionOf, spaceIdOf and credentialKindOf read the connection", () => {
  assertEquals(regionOf(DELIVERY), "eu");
  assertEquals(regionOf({ display: { region: "nowhere" } }), "eu", "an unknown region falls back");
  assertEquals(regionOf(undefined), "eu");
  assertEquals(spaceIdOf(MANAGEMENT), "123");
  assertEquals(credentialKindOf(MANAGEMENT), "management");
  assertEquals(credentialKindOf(undefined), "delivery");
});

/** Storyblok's answer to every credential problem is the same bare string. */
Deno.test("assertCredential: refuses the wrong credential kind with the reason", () => {
  assertCredential(DELIVERY, "delivery");
  assertCredential(MANAGEMENT, "management");

  const needsManagement = assertThrows(() => assertCredential(DELIVERY, "management"), Error);
  assert(/read-only by design/.test(needsManagement.message), needsManagement.message);
  const needsDelivery = assertThrows(() => assertCredential(MANAGEMENT, "delivery"), Error);
  assert(/separate credentials on separate hosts/.test(needsDelivery.message));
});

/** Storyblok's own table, and the arithmetic that runs backwards. */
Deno.test("rateLimitFor and throughputFor: a bigger page moves less content", () => {
  assertEquals(rateLimitFor(1), 50);
  assertEquals(rateLimitFor(25), 50);
  assertEquals(rateLimitFor(50), 15);
  assertEquals(rateLimitFor(75), 10);
  assertEquals(rateLimitFor(100), 6);

  assertEquals(throughputFor(25), 1250);
  assertEquals(throughputFor(100), 600);
  assert(throughputFor(25) > throughputFor(100), "smaller pages should move more content");
});

/** A missing `_uid` can import cleanly and render as an empty block. */
Deno.test("validateContent: enforces Storyblok's three shape rules", () => {
  assertEquals(validateContent({ component: "page", body: [] }), []);
  assertEquals(
    validateContent({ component: "page", body: [{ component: "hero", _uid: "abc" }] }),
    [],
  );

  assertEquals(validateContent("nope")[0], "`content` must be an object at the root level");
  assertEquals(validateContent([])[0], "`content` must be an object at the root level");
  assert(/needs a `component` property/.test(validateContent({ body: [] })[0]));

  const missingUid = validateContent({ component: "page", body: [{ component: "hero" }] });
  assertEquals(missingUid.length, 1);
  assert(/content\.body\[0\] is a nested `hero` component with no `_uid`/.test(missingUid[0]));
});

Deno.test("validateContent: walks nested components at any depth", () => {
  const problems = validateContent({
    component: "page",
    body: [
      { component: "grid", _uid: "a", columns: [{ component: "card" }] },
    ],
  });
  assertEquals(problems.length, 1);
  assert(/columns\[0\]/.test(problems[0]), problems[0]);
});

Deno.test("compact, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 2, c: "" }), { a: "x", b: 2 });
});

/** The wrong region is the failure people lose an afternoon to. */
Deno.test("describeError: a 401 names the region as well as the token", () => {
  const delivery = describeError(401, '{"error":"Unauthorized"}', "delivery");
  assert(/SPACE IS IN ANOTHER REGION/.test(delivery), delivery);
  assert(/management token, which the delivery API does not accept/.test(delivery));

  const management = describeError(401, '{"error":"Unauthorized"}', "management");
  assert(/`Bearer` prefix/.test(management), management);
});

Deno.test("describeError: a 404 names the draft-versus-published split", () => {
  assert(/DRAFT and PUBLISHED separately/.test(describeError(404, "{}", "delivery")));
});

Deno.test("describeError: a 429 quotes both rate limits", () => {
  const message = describeError(429, "{}", "delivery");
  assert(/50 requests a second for pages of 25/.test(message), message);
  assert(/3 to 6 a second/.test(message), message);
});

Deno.test("request: an error names the method, the path and the reason", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { error: "invalid" } }], MANAGEMENT);
  let message = "";
  try {
    await new StoryblokClient(ctx).management("/spaces/123/stories", { method: "POST", body: {} });
  } catch (err) {
    message = String(err);
  }
  assert(/Storyblok 422 for POST \/v1\/spaces\/123\/stories/.test(message), message);
  assert(/every nested one a `_uid`/.test(message), message);
});
