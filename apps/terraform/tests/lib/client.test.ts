import { assert, assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  DEFAULT_HOST,
  describeError,
  document,
  emptyToUndefined,
  flatten,
  flattenAll,
  hostFromConnection,
  json,
  MEDIA_TYPE,
  normalizeHost,
  pagination,
  parseRateLimit,
  query,
  relatedId,
  relation,
  resolve,
  TerraformClient,
} from "../../lib/client.ts";

Deno.test("normalizeHost: defaults to the managed service and accepts a bare hostname", () => {
  assertEquals(normalizeHost(undefined), DEFAULT_HOST);
  assertEquals(normalizeHost(""), DEFAULT_HOST);
  assertEquals(normalizeHost("tfe.example.com"), "https://tfe.example.com");
  assertEquals(normalizeHost("https://tfe.example.com/"), "https://tfe.example.com");
  assertEquals(normalizeHost("https://tfe.example.com:8443"), "https://tfe.example.com:8443");
  assertThrows(() => normalizeHost("https://:::"), Error, "not a valid URL");
});

/** Terraform Enterprise is the same API at the customer's own address. */
Deno.test("hostFromConnection: reads the connection's own instance", () => {
  const managed = mockCtx([], { display: {} });
  assertEquals(hostFromConnection(managed.ctx.connection), DEFAULT_HOST);
  const enterprise = mockCtx([], { display: { host: "https://tfe.example.com" } });
  assertEquals(hostFromConnection(enterprise.ctx.connection), "https://tfe.example.com");
});

/** `application/json` is refused on a write. */
Deno.test("request: speaks JSON:API on the way out and the way in", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: {} } }]);
  await new TerraformClient(ctx).request("/api/v2/organizations", {
    method: "POST",
    body: { data: {} },
  });
  assertEquals(calls[0].headers["content-type"], MEDIA_TYPE);
  assertEquals(calls[0].headers["accept"], MEDIA_TYPE);
});

Deno.test("request: a GET carries no content-type at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await new TerraformClient(ctx).request("/api/v2/organizations");
  assertEquals(calls[0].headers["content-type"], undefined);
  assertEquals(calls[0].url, `${DEFAULT_HOST}/api/v2/organizations`);
});

/** The auth hook signs; the client must never carry a token itself. */
Deno.test("request: never sets an authorization header", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await new TerraformClient(ctx).request("/api/v2/organizations");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("request: a 204 yields an empty document rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new TerraformClient(ctx).request("/api/v2/ping"), {});
});

/** `x-ratelimit-reset` is fractional SECONDS. `new Date(reset*1000)` is 1970. */
Deno.test("parseRateLimit: reads the per-second window as seconds, not a timestamp", () => {
  const headers = new Headers({
    "x-ratelimit-limit": "30",
    "x-ratelimit-remaining": "29",
    "x-ratelimit-reset": "1.0",
  });
  assertEquals(parseRateLimit(headers), { limit: 30, remaining: 29, resetsIn: 1 });
  assert(parseRateLimit(headers).resetsIn! < 60, "a reset of 1.0 is one second, not an epoch");
});

Deno.test("parseRateLimit: absent headers give undefined rather than NaN", () => {
  assertEquals(parseRateLimit(new Headers()), {
    limit: undefined,
    remaining: undefined,
    resetsIn: undefined,
  });
});

Deno.test("full: surfaces what the instance says about itself", async () => {
  const { ctx } = mockCtx([{
    status: 204,
    headers: { "tfp-appname": "HCP Terraform", "tfp-api-version": "2.6" },
  }]);
  const result = await new TerraformClient(ctx).full("/api/v2/ping");
  assertEquals(result.appName, "HCP Terraform");
  assertEquals(result.apiVersion, "2.6");
  assertEquals(result.status, 204);
});

/** JSON:API's envelope, and the `type` is checked by the server. */
Deno.test("document: wraps attributes and relationships in the shape writes need", () => {
  assertEquals(document("workspaces", { name: "prod" }), {
    data: { type: "workspaces", attributes: { name: "prod" } },
  });
  assertEquals(document("runs", { message: "x" }, { workspace: relation("workspaces", "ws-1") }), {
    data: {
      type: "runs",
      attributes: { message: "x" },
      relationships: { workspace: { data: { type: "workspaces", id: "ws-1" } } },
    },
  });
  assertEquals(document("workspaces", {}), { data: { type: "workspaces" } });
});

/** The fields a workflow wants are one level down, under kebab-case names. */
Deno.test("flatten: lifts attributes up and keeps the API's own spelling", () => {
  assertEquals(
    flatten({ type: "workspaces", id: "ws-1", attributes: { "auto-apply": true } }),
    { id: "ws-1", type: "workspaces", "auto-apply": true },
  );
  assertEquals(flatten(undefined), undefined);
  assertEquals(flattenAll(undefined), []);
});

/**
 * `?include=` appends a sibling array; the record keeps a pointer. Reading
 * `run.plan.x` gets undefined from a document that contains x.
 */
Deno.test("resolve: joins a sideloaded record back onto the one pointing at it", () => {
  const run = {
    type: "runs",
    id: "run-1",
    relationships: { plan: { data: { type: "plans", id: "plan-1" } } },
  };
  const included = [{
    type: "plans",
    id: "plan-1",
    attributes: { "resource-destructions": 3 },
  }];
  assertEquals(resolve(run, "plan", included)?.["resource-destructions"], 3);
  assertEquals(relatedId(run, "plan"), "plan-1");
});

Deno.test("resolve: a pointer with nothing sideloaded is undefined, not an error", () => {
  const run = { relationships: { plan: { data: { type: "plans", id: "plan-1" } } } };
  assertEquals(resolve(run, "plan", []), undefined);
  assertEquals(resolve(run, "apply", []), undefined);
  assertEquals(relatedId(undefined, "plan"), undefined);
});

/** Pagination is kebab-case too, and `next-page` is null on the last page. */
Deno.test("pagination: reads meta.pagination's kebab-case fields", () => {
  assertEquals(
    pagination({
      pagination: { "current-page": 2, "next-page": 3, "total-pages": 9, "total-count": 174 },
    }),
    { page: 2, nextPage: 3, totalPages: 9, totalCount: 174 },
  );
  // `Number(null)` is 0, which is a page number a loop would happily request.
  assertEquals(
    pagination({ pagination: { "current-page": 9, "next-page": null } }).nextPage,
    undefined,
  );
  assertEquals(pagination(undefined).page, undefined);
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

/** A bare "unauthorized" is what four different problems look like. */
Deno.test("describeError: a 401 says the message does not distinguish the causes", () => {
  const message = describeError(
    401,
    JSON.stringify({
      errors: [{ status: "401", title: "unauthorized" }],
    }),
  );
  assert(/unauthorized/.test(message), message);
  assert(/a different instance alike/.test(message), message);
});

Deno.test("describeError: a 403 names token type as the usual cause", () => {
  const message = describeError(403, "{}");
  assert(/organization token cannot create runs/.test(message), message);
  assert(/team token only reaches/.test(message), message);
});

/** 404 and 403 are not distinguishable here, which is deliberate on their side. */
Deno.test("describeError: a 404 warns it may be a permission, not an absence", () => {
  const message = describeError(404, "{}");
  assert(/may mean it does not exist OR/.test(message), message);
});

Deno.test("describeError: 409, 422 and 429 explain the shapes behind them", () => {
  assert(/already been applied/.test(describeError(409, "{}")));
  const unprocessable = describeError(422, "{}");
  assert(/KEBAB-case/.test(unprocessable), unprocessable);
  assert(/ignored silently/.test(unprocessable), unprocessable);
  assert(/fan-out problem/.test(describeError(429, "{}")));
});

Deno.test("describeError: the detail comes out of the JSON:API errors array", () => {
  const message = describeError(
    422,
    JSON.stringify({
      errors: [{ title: "invalid attribute", detail: "name has already been taken" }],
    }),
  );
  assert(/name has already been taken/.test(message), message);
});

Deno.test("request: an error names the method, the path and the explanation", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { errors: [{ title: "forbidden" }] } }]);
  let message = "";
  try {
    await new TerraformClient(ctx).request("/api/v2/runs", { method: "POST", body: {} });
  } catch (err) {
    message = String(err);
  }
  assert(/403/.test(message), message);
  assert(/POST \/api\/v2\/runs/.test(message), message);
  assert(/TOKEN TYPE/.test(message), message);
});

Deno.test("request: a non-JSON body fails with what came back", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>login</html>" }]);
  let message = "";
  try {
    await new TerraformClient(ctx).request("/api/v2/organizations");
  } catch (err) {
    message = String(err);
  }
  assert(/did not return JSON:API/.test(message), message);
});
