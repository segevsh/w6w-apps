import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_HOST,
  AtlasClient,
  compact,
  csv,
  DEFAULT_VERSION,
  describeError,
  emptyToUndefined,
  json,
  mediaType,
  OAUTH_TOKEN_URL,
  projectId,
  query,
} from "../../lib/client.ts";

Deno.test("the control plane host and token endpoint are what the app talks to", () => {
  assertEquals(API_HOST, "https://cloud.mongodb.com");
  assertEquals(OAUTH_TOKEN_URL, "https://cloud.mongodb.com/api/oauth/token");
});

/** A date in the Accept header — not a URL segment, not a custom header. */
Deno.test("mediaType: the version is a date inside the media type", () => {
  assertEquals(mediaType(), `application/vnd.atlas.${DEFAULT_VERSION}+json`);
  assertEquals(mediaType("2024-11-13"), "application/vnd.atlas.2024-11-13+json");
});

/** Omitting it falls back to the oldest version, several years back. */
Deno.test("request: always sends a version, and defaults to a recent one", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new AtlasClient(ctx).request("/api/atlas/v2/orgs");
  assertEquals(calls[0].headers["accept"], `application/vnd.atlas.${DEFAULT_VERSION}+json`);
  assert(DEFAULT_VERSION >= "2025-01-01", "the default should be recent, not the oldest");
});

Deno.test("request: an action may raise the version for its own endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new AtlasClient(ctx).request("/api/atlas/v2/groups/x/flexClusters", {
    version: "2024-11-13",
  });
  assertEquals(calls[0].headers["accept"], "application/vnd.atlas.2024-11-13+json");
});

/** The versioned type is required on writes too, not only on reads. */
Deno.test("request: a write sends the versioned type as content-type as well", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new AtlasClient(ctx).request("/api/atlas/v2/groups/x/clusters", {
    method: "POST",
    body: { name: "c" },
    version: "2024-10-23",
  });
  assertEquals(calls[0].headers["content-type"], "application/vnd.atlas.2024-10-23+json");
  assertEquals(calls[0].headers["accept"], "application/vnd.atlas.2024-10-23+json");
});

/** The auth hook signs; the client must never carry a token itself. */
Deno.test("request: never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await new AtlasClient(ctx).request("/api/atlas/v2/orgs");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("request: a 204 returns undefined rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new AtlasClient(ctx).request("/api/atlas/v2/x"), undefined);
});

Deno.test("list: unwraps results and totalCount, and tolerates neither being there", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { results: [{ id: "a" }], totalCount: 7 } }]);
  assertEquals(await new AtlasClient(ctx).list("/x"), { results: [{ id: "a" }], totalCount: 7 });

  const empty = mockCtx([{ status: 200, body: {} }]);
  assertEquals(await new AtlasClient(empty.ctx).list("/x"), {
    results: [],
    totalCount: undefined,
  });
});

/** Atlas validates ids after authorisation, so a typo answers 401. */
Deno.test("projectId: the 24-hex shape is checked before sending", () => {
  assertEquals(projectId("5f8d0d55b54eff0f2b2c3d4e"), "5f8d0d55b54eff0f2b2c3d4e");
  const error = assertThrows(() => projectId("my-project"), Error);
  assert(/24-character hex project id/.test(error.message), error.message);
  assert(/`groups` in its paths/.test(error.message), error.message);
  assertThrows(() => projectId(""), Error, "required");
  assertThrows(() => projectId("5f8d0d55b54eff0f2b2c3d4"), Error);
});

Deno.test("compact, emptyToUndefined, csv, json and query behave as the actions assume", () => {
  assertEquals(compact({ a: 1, b: "", c: undefined, d: [] }), { a: 1 });
  assertEquals(emptyToUndefined({ a: "", b: undefined }), undefined);
  assertEquals(emptyToUndefined({ a: 1 }), { a: 1 });
  assertEquals(csv("a, b"), ["a", "b"]);
  assertEquals(csv(""), undefined);
  assertEquals(json('{"a":1}', "x"), { a: 1 });
  assertThrows(() => json("{oops", "x"), Error, "`x` is not valid JSON");
  assertEquals(query({ a: "x", b: 2, c: "" }), { a: "x", b: 2 });
});

/** The useful field is errorCode; detail is often generic. */
Deno.test("describeError: pulls detail and errorCode out of the body", () => {
  const message = describeError(
    400,
    JSON.stringify({ detail: "Cluster name in use", errorCode: "DUPLICATE_CLUSTER_NAME" }),
  );
  assert(/Cluster name in use/.test(message), message);
  assert(/DUPLICATE_CLUSTER_NAME/.test(message), message);
});

/** Measured: a bearer 401 has no body at all, unlike the digest one. */
Deno.test("describeError: a 401 with no body still explains itself", () => {
  const message = describeError(401, "");
  assert(/lasts an hour/.test(message), message);
  assert(/malformed project id/.test(message), message);
});

Deno.test("describeError: a 403 names project-level roles", () => {
  const message = describeError(403, "{}");
  assert(/per PROJECT as well as per organisation/.test(message), message);
});

/** The version trap: an endpoint newer than the pinned date simply 404s. */
Deno.test("describeError: a 404 names the version that was asked for", () => {
  const message = describeError(404, "{}", "2023-01-01");
  assert(/asked for 2023-01-01/.test(message), message);
  assert(/says\s+nothing about versions/.test(message), message);
});

Deno.test("describeError: a 409 explains that cluster changes take minutes", () => {
  assert(/still applying the previous one/.test(describeError(409, "{}")));
});

Deno.test("request: an error names the method, the path and the explanation", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { detail: "no", errorCode: "FORBIDDEN" } }]);
  let message = "";
  try {
    await new AtlasClient(ctx).request("/api/atlas/v2/groups/x/clusters");
  } catch (err) {
    message = String(err);
  }
  assert(/403/.test(message), message);
  assert(/GET \/api\/atlas\/v2\/groups\/x\/clusters/.test(message), message);
});

Deno.test("request: a non-JSON body fails with what came back", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html/>" }]);
  let message = "";
  try {
    await new AtlasClient(ctx).request("/api/atlas/v2/orgs");
  } catch (err) {
    message = String(err);
  }
  assert(/did not return JSON/.test(message), message);
});
