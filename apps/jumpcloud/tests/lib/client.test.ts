import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  apiUrl,
  apiV2Url,
  assertNotLoginPage,
  compact,
  csv,
  hostFor,
  json,
  JumpCloudClient,
  REGIONS,
  resolveRegion,
  spaced,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("the three regions are the hosts the specs' servers blocks name", () => {
  assertEquals(REGIONS, {
    us: "console.jumpcloud.com",
    eu: "console.eu.jumpcloud.com",
    in: "console.in.jumpcloud.com",
  });
  assertEquals(hostFor("eu"), "console.eu.jumpcloud.com");
});

/** V2 did not replace V1: they are two base paths on the same host. */
Deno.test("the two APIs are two base paths, not two versions", () => {
  assertEquals(apiUrl("us"), "https://console.jumpcloud.com/api");
  assertEquals(apiV2Url("us"), "https://console.jumpcloud.com/api/v2");
  assertEquals(apiV2Url("in"), "https://console.in.jumpcloud.com/api/v2");
});

Deno.test("resolveRegion defaults to us and ignores a value it does not know", () => {
  assertEquals(resolveRegion(undefined), "us");
  assertEquals(resolveRegion({ display: {} } as never), "us");
  assertEquals(resolveRegion({ display: { region: "eu" } } as never), "eu");
  assertEquals(resolveRegion({ display: { region: "EU" } } as never), "eu");
  assertEquals(resolveRegion({ display: { region: "mars" } } as never), "us");
});

Deno.test("compact / csv / json behave as the actions expect", () => {
  assertEquals(compact({ a: 1, b: "", c: null, d: undefined, e: [], f: false }), {
    a: 1,
    f: false,
  });
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "attributes"), Error, "`attributes` is not valid JSON");
});

/**
 * JumpCloud's sort and fields are space-separated. A comma-separated value is
 * not rejected — it is read as one impossible field name and ignored.
 */
Deno.test("spaced converts the pack's comma convention to JumpCloud's spaces", () => {
  assertEquals(spaced("lastname, -created"), "lastname -created");
  assertEquals(spaced(""), undefined);
  assertEquals(spaced(["a", "b"]), "a b");
});

Deno.test("client: builds V1 paths on the connection's region", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], {
    display: { region: "eu" },
  });
  await new JumpCloudClient(ctx).request("/systemusers", { query: { limit: 1 } });
  assertEquals(calls[0].url, "https://console.eu.jumpcloud.com/api/systemusers?limit=1");
});

Deno.test('client: `api: "v2"` moves the call to the V2 base', async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], { display: { region: "us" } });
  await new JumpCloudClient(ctx).request("/usergroups", { api: "v2" });
  assertEquals(calls[0].url, "https://console.jumpcloud.com/api/v2/usergroups");
});

Deno.test("client: never sends the api key — signing is the host's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await new JumpCloudClient(ctx).request("/systemusers");
  assertEquals(calls[0].headers["x-api-key"], undefined);
  assertEquals(calls[0].headers["x-org-id"], undefined);
});

Deno.test("client: a failure surfaces the status and JumpCloud's error envelope", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    statusText: "Unauthorized",
    body: { error: "Unauthorized", message: "Unauthorized: api key user not found" },
  }], { display: {} });
  const err = await assertRejects(
    async () => await new JumpCloudClient(ctx).request("/systemusers"),
    Error,
  );
  assert(err.message.includes("401"), err.message);
  assert(err.message.includes("api key user not found"), err.message);
});

/**
 * The measured trap: no api key answers 302 to /login, and following it yields
 * a 200 HTML page that reads as success.
 */
Deno.test("assertNotLoginPage turns the login redirect back into a failure", () => {
  const url = new URL("https://console.jumpcloud.com/api/systemusers");
  const redirect = new Response(null, { status: 302, headers: { location: "/login" } });
  const err = assertThrows(() => assertNotLoginPage(redirect, url), Error);
  assert(err.message.includes("no api key"), err.message);
  assert(err.message.includes("/login"), err.message);
});

Deno.test("assertNotLoginPage leaves real responses alone", () => {
  const url = new URL("https://console.jumpcloud.com/api/systemusers");
  assertNotLoginPage(new Response(null, { status: 200 }), url);
  assertNotLoginPage(new Response(null, { status: 401 }), url);
  assertNotLoginPage(new Response(null, { status: 500 }), url);
});

Deno.test("client: requests are made with redirect: manual, not followed", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display: {} });
  await new JumpCloudClient(ctx).request("/systemusers");
  assertEquals(calls[0].redirect, "manual");
});

Deno.test("client: a redirect from the API is raised, not parsed", async () => {
  const { ctx } = mockCtx([{ status: 302, headers: { location: "/login" }, body: "" }], {
    display: {},
  });
  await assertRejects(
    async () => await new JumpCloudClient(ctx).request("/systemusers"),
    Error,
    "no api key",
  );
});

/** V1 wraps its list in `results`; V2 answers a bare array. */
Deno.test("requestAll reads the V1 envelope and the V2 bare array alike", async () => {
  const v1 = mockCtx([{ status: 200, body: { results: [{ _id: "a" }], totalCount: 1 } }], {
    display: {},
  });
  assertEquals(await new JumpCloudClient(v1.ctx).requestAll("/systemusers", {}, 50), [
    { _id: "a" },
  ]);

  const v2 = mockCtx([{ status: 200, body: [{ id: "g1" }] }], { display: {} });
  assertEquals(await new JumpCloudClient(v2.ctx).requestAll("/usergroups", { api: "v2" }, 50), [
    { id: "g1" },
  ]);
});

/**
 * JumpCloud sends no next cursor, so a page shorter than the one asked for is
 * how the walk knows it has reached the end.
 */
Deno.test("requestAll walks the skip offset until a short page", async () => {
  const full = Array.from({ length: 100 }, (_, i) => ({ _id: `u${i}` }));
  const { ctx, calls } = mockCtx([
    { status: 200, body: { results: full } },
    { status: 200, body: { results: [{ _id: "last" }] } },
  ], { display: {} });
  const all = await new JumpCloudClient(ctx).requestAll("/systemusers");
  assertEquals(all.length, 101);
  assertEquals(new URL(calls[0].url).searchParams.get("skip"), "0");
  assertEquals(new URL(calls[1].url).searchParams.get("skip"), "100");
});

Deno.test("requestAll stops on the first page when it is already short", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { results: [{ _id: "a" }, { _id: "b" }] } },
  ], { display: {} });
  assertEquals((await new JumpCloudClient(ctx).requestAll("/systemusers", {}, 50)).length, 2);
  assertEquals(calls.length, 1);
});

Deno.test("requestAll asks for no more than it wants, and never over 100", async () => {
  const small = mockCtx([{ status: 200, body: { results: [] } }], { display: {} });
  await new JumpCloudClient(small.ctx).requestAll("/systemusers", {}, 5);
  assertEquals(new URL(small.calls[0].url).searchParams.get("limit"), "5");

  const big = mockCtx([{ status: 200, body: { results: [] } }], { display: {} });
  await new JumpCloudClient(big.ctx).requestAll("/systemusers", {}, Infinity);
  assertEquals(new URL(big.calls[0].url).searchParams.get("limit"), "100");
});
