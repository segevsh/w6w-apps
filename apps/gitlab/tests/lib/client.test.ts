import { assertEquals, assertRejects } from "@std/assert";
import {
  compact,
  csv,
  filePathSegment,
  GitLabClient,
  projectPath,
  resolveApiBase,
  unset,
} from "../../lib/client.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("resolveApiBase: defaults to GitLab.com and appends /api/v4", () => {
  assertEquals(resolveApiBase(), "https://gitlab.com/api/v4");
  assertEquals(resolveApiBase(""), "https://gitlab.com/api/v4");
  assertEquals(resolveApiBase("   "), "https://gitlab.com/api/v4");
});

Deno.test("resolveApiBase: honours a self-managed root and trims trailing slashes", () => {
  assertEquals(resolveApiBase("https://gitlab.example.com"), "https://gitlab.example.com/api/v4");
  assertEquals(resolveApiBase("https://gitlab.example.com/"), "https://gitlab.example.com/api/v4");
});

Deno.test("client: targets GitLab.com when the connection carries no baseUrl, sets no auth header", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await new GitLabClient(ctx).request("/user");
  assertEquals(calls[0].url, "https://gitlab.com/api/v4/user");
  assertEquals("authorization" in calls[0].headers, false);
  assertEquals("private-token" in calls[0].headers, false);
});

Deno.test("client: surfaces GitLab's error body", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    statusText: "Bad Request",
    body: '{"message":"tag_name is missing"}',
  }]);
  await assertRejects(
    () => new GitLabClient(ctx).request("/projects/1/releases", { method: "POST", body: {} }),
    Error,
    "tag_name is missing",
  );
});

Deno.test("client: returns undefined for a 204", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new GitLabClient(ctx).request("/x", { method: "DELETE" }), undefined);
});

Deno.test("projectPath: encodes a namespaced path but leaves a numeric id alone", () => {
  assertEquals(projectPath("278964"), "278964");
  assertEquals(projectPath("group/project"), "group%2Fproject");
  assertEquals(projectPath("a/b/c"), "a%2Fb%2Fc");
});

Deno.test("filePathSegment: encodes the whole path including slashes and dots", () => {
  assertEquals(filePathSegment("src/index.ts"), "src%2Findex.ts");
});

Deno.test("compact keeps false/0 but drops unset fields", () => {
  assertEquals(compact({ draft: false, n: 0, a: undefined, b: null }), { draft: false, n: 0 });
});

Deno.test("csv: splits, trims and drops blanks; an empty field stays unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
  assertEquals(csv(" , "), undefined);
});

Deno.test("unset: a blank form field is absent", () => {
  assertEquals(unset(""), undefined);
  assertEquals(unset("x"), "x");
});
