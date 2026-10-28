import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  API_VERSION,
  AzureDevOpsClient,
  compact,
  csv,
  describeError,
  fieldsToPatch,
  json,
  organizationFromConnection,
  qualifyField,
  query,
} from "../../lib/client.ts";

const display = { organization: "contoso" };

Deno.test("compact: drops unset keys so a filter is absent rather than empty", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: [], f: false }), {
    a: 1,
    f: false,
  });
});

/** Azure DevOps takes comma-delimited lists, not repeated keys. */
Deno.test("query: joins arrays with commas and drops blanks", () => {
  assertEquals(query({ a: 1, b: false, c: ["x", "y"], d: "", e: undefined }), {
    a: 1,
    b: false,
    c: "x,y",
  });
});

Deno.test("csv: splits, trims and drops empties", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
});

Deno.test("json: parses text and names the bad field", () => {
  assertEquals(json('{"a":1}', "fields"), { a: 1 });
  try {
    json("{oops", "fields");
    throw new Error("expected a throw");
  } catch (err) {
    assert(String(err).includes("`fields`"), String(err));
  }
});

Deno.test("organizationFromConnection: refuses with an actionable message when unset", () => {
  assertEquals(organizationFromConnection({ display } as never), "contoso");
  try {
    organizationFromConnection({ display: {} } as never);
    throw new Error("expected a throw");
  } catch (err) {
    assert(/reconnect/.test(String(err)), String(err));
  }
});

/**
 * A caller writing `title` is not corrected by Azure DevOps — the field is
 * simply not set.
 */
Deno.test("qualifyField: expands short names and leaves qualified ones alone", () => {
  assertEquals(qualifyField("title"), "System.Title");
  assertEquals(qualifyField("assignedTo"), "System.AssignedTo");
  assertEquals(qualifyField("priority"), "Microsoft.VSTS.Common.Priority");
  assertEquals(qualifyField("System.State"), "System.State");
  // A custom field keeps its own namespace.
  assertEquals(qualifyField("Custom.TeamArea"), "Custom.TeamArea");
});

Deno.test("qualifyField: an unknown short name falls back to the System namespace", () => {
  assertEquals(qualifyField("BoardColumn"), "System.BoardColumn");
});

/** Work items are the only part of the API that takes a patch document. */
Deno.test("fieldsToPatch: builds add operations with qualified paths", () => {
  assertEquals(fieldsToPatch({ title: "Fix login", priority: 1 }), [
    { op: "add", path: "/fields/System.Title", value: "Fix login" },
    { op: "add", path: "/fields/Microsoft.VSTS.Common.Priority", value: 1 },
  ]);
});

Deno.test("fieldsToPatch: unset fields produce no operations", () => {
  assertEquals(fieldsToPatch({ title: "", state: undefined, tags: null }), []);
});

Deno.test("client: builds an org-scoped path and pins the api-version", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { value: [] } }], { display });
  const client = new AzureDevOpsClient(ctx);
  await client.list(client.path("_apis/projects"));
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://dev.azure.com/contoso/_apis/projects");
  assertEquals(url.searchParams.get("api-version"), API_VERSION);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("client: path segments are encoded but slashes inside one are kept", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  const client = new AzureDevOpsClient(ctx);
  await client.request(client.path("My Project", "_apis/git/repositories", "my repo"));
  assertEquals(
    new URL(calls[0].url).pathname,
    "/contoso/My%20Project/_apis/git/repositories/my%20repo",
  );
});

/**
 * THE finding. A rejected credential answers 302 to a sign-in page, so
 * following redirects turns an auth failure into a 200 of HTML.
 */
Deno.test("client: never follows redirects", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { value: [] } }], { display });
  const client = new AzureDevOpsClient(ctx);
  await client.list(client.path("_apis/projects"));
  assertEquals(calls[0].redirect, "manual");
});

Deno.test("client: a 302 is reported as a rejected credential, not a success", async () => {
  const { ctx } = mockCtx([{ status: 302, body: "<html>sign in</html>" }], { display });
  const client = new AzureDevOpsClient(ctx);
  await assertRejects(
    async () => await client.request(client.path("_apis/projects")),
    Error,
    "redirected to a sign-in page",
  );
});

Deno.test("client: unwraps a {count, value} collection", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: { count: 2, value: [{ id: "a" }, { id: "b" }] } }],
    {
      display,
    },
  );
  const client = new AzureDevOpsClient(ctx);
  assertEquals((await client.list(client.path("_apis/projects"))).length, 2);
});

Deno.test("client: a work item body can carry the patch content type", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }], { display });
  const client = new AzureDevOpsClient(ctx);
  await client.request(client.path("p", "_apis/wit/workitems", "$Bug"), {
    method: "POST",
    contentType: "application/json-patch+json",
    body: [{ op: "add", path: "/fields/System.Title", value: "x" }],
  });
  assertEquals(calls[0].headers["content-type"], "application/json-patch+json");
});

/** A missing scope answers 404, which reads as a missing project. */
Deno.test("describeError: a 404 warns that it may be a scope", () => {
  const out = describeError(404, JSON.stringify({ message: "Not found" }));
  assert(/missing scope can look like a missing project/.test(out), out);
});

Deno.test("describeError: a 401 points at the token's per-area scopes", () => {
  assert(/scoped per area/.test(describeError(401, "{}")));
});

Deno.test("describeError: keeps the machine-readable typeKey alongside the message", () => {
  const out = describeError(
    400,
    JSON.stringify({ message: "The value is invalid", typeKey: "InvalidArgumentValueException" }),
  );
  assert(out.includes("InvalidArgumentValueException"), out);
});

/** An HTML body means a sign-in redirect was followed somewhere. */
Deno.test("describeError: an HTML body is named as a followed redirect", () => {
  const out = describeError(200, "<html><body>Sign in</body></html>");
  assert(/sign-in redirect was followed/.test(out), out);
});

/**
 * `$` is part of the route for work item creation — `_apis/wit/workitems/$Bug`
 * — and `%24Bug` is a different path that does not exist.
 */
Deno.test("client: leaves a dollar sign unencoded in a path segment", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1 } }], { display });
  const client = new AzureDevOpsClient(ctx);
  await client.request(client.path("P", "_apis/wit/workitems", "$User Story"), { method: "POST" });
  assertEquals(
    new URL(calls[0].url).pathname,
    "/contoso/P/_apis/wit/workitems/$User%20Story",
  );
});
