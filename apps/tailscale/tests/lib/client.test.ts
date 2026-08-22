import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API,
  assertTags,
  compact,
  csv,
  DEFAULT_TAILNET,
  describeError,
  EXIT_NODE_ROUTES,
  isExitNode,
  json,
  query,
  tailnetFrom,
  TailscaleClient,
} from "../../lib/client.ts";

Deno.test("request: builds the v2 path and never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new TailscaleClient(ctx).request("/tailnet/-/devices");
  assertEquals(calls[0].url, `${API}/tailnet/-/devices`);
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** The policy file is HuJSON and asking for JSON drops its comments. */
Deno.test("request: an explicit accept header wins, and text mode returns the body", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "{ // a comment\n}" }]);
  const result = await new TailscaleClient(ctx).request<string>("/tailnet/-/acl", {
    accept: "application/hujson",
    text: true,
  });
  assertEquals(calls[0].headers["accept"], "application/hujson");
  assertEquals(result, "{ // a comment\n}");
});

/** Repeating a filter is how Tailscale expresses "all of these". */
Deno.test("request: repeated query keys are appended rather than overwritten", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new TailscaleClient(ctx).request("/tailnet/-/devices?tags=tag:a&tags=tag:b");
  assertEquals(new URL(calls[0].url).searchParams.getAll("tags"), ["tag:a", "tag:b"]);
});

Deno.test("tailnetFrom: defaults to the dash, which means the credential's own", () => {
  assertEquals(DEFAULT_TAILNET, "-");
  assertEquals(tailnetFrom(undefined), "-");
  assertEquals(tailnetFrom({ display: {} }), "-");
  assertEquals(tailnetFrom({ display: { tailnet: "T1234CNTRL" } }), "T1234CNTRL");
});

/** A bare `web` fails in a way that reads as a missing definition. */
Deno.test("assertTags: demands the tag: prefix and explains the confusion", () => {
  assertTags(["tag:prod", "tag:web-01"], "tags");
  const err = assertThrows(() => assertTags(["tag:prod", "web", "prod"], "tags"), Error);
  assert(/these do not: web, prod/.test(err.message), err.message);
  assert(/missing prefix/.test(err.message), err.message);
});

/** The same field shape means two very different things. */
Deno.test("isExitNode: either default route counts", () => {
  assertEquals(EXIT_NODE_ROUTES, ["0.0.0.0/0", "::/0"]);
  assertEquals(isExitNode(["10.0.0.0/16"]), false);
  assertEquals(isExitNode(["10.0.0.0/16", "0.0.0.0/0"]), true);
  assertEquals(isExitNode(["::/0"]), true);
  assertEquals(isExitNode([]), false);
});

Deno.test("compact, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(csv("tag:a, tag:b"), ["tag:a", "tag:b"]);
  assertEquals(csv(""), undefined);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 2, c: "", d: true }), { a: "x", b: 2, d: true });
});

/** Verified live: both credential kinds fail with the same message. */
Deno.test("describeError: a 401 says the message cannot tell the two credentials apart", () => {
  const message = describeError(401, JSON.stringify({ message: "API token invalid" }));
  assert(/BOTH a bad API access token and a bad OAuth client/.test(message), message);
  assert(/expires after 1 to 90 days/.test(message), message);
});

Deno.test("describeError: a 403 names scopes against a user's role", () => {
  const message = describeError(403, JSON.stringify({ message: "forbidden" }));
  assert(/SCOPES/.test(message), message);
});

Deno.test("describeError: a 404 names the dash and the nodeId", () => {
  const message = describeError(404, JSON.stringify({ message: "not found" }));
  assert(/`-` for the calling credential's own/.test(message), message);
});

/** By the time somebody opens a ticket the response is long gone. */
Deno.test("describeError: carries the request id Tailscale support can trace", () => {
  const message = describeError(500, "{}", "REQ-123");
  assert(/\[request REQ-123\]/.test(message), message);
  assert(!/\[request/.test(describeError(500, "{}", null)));
});

Deno.test("request: an error names the method, the path, the reason and the request id", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { message: "device not found" },
    headers: { "x-tailscale-request-id": "REQ-9" },
  }]);
  let message = "";
  try {
    await new TailscaleClient(ctx).request("/device/nope");
  } catch (err) {
    message = String(err);
  }
  assert(/404/.test(message), message);
  assert(/GET \/api\/v2\/device\/nope/.test(message), message);
  assert(/REQ-9/.test(message), message);
});

Deno.test("request: a 204 returns nothing rather than failing to parse", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(
    await new TailscaleClient(ctx).request("/device/x/expire", { method: "POST" }),
    undefined,
  );
});
