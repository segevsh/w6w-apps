import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/project-list.ts";

const D = { display: { host: "https://gerrit.example.com" } };
const PREFIX = ")]}'\n";
const projects = {
  status: 200,
  body: PREFIX + JSON.stringify({
    "All-Projects": { state: "ACTIVE" },
    "All-Users": { state: "ACTIVE" },
    "platform/frameworks/base": { state: "ACTIVE", parent: "All-Projects" },
    "platform/legacy": { state: "READ_ONLY" },
    "internal/secret": { state: "HIDDEN" },
  }),
};

/** Gerrit's list endpoints are objects keyed by identifier. */
Deno.test("project-list: reads the by-name object and excludes the config repos", async () => {
  const { ctx, calls } = mockCtx([projects], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/a/projects/");
  assertEquals(result.count, 3);
  assertEquals(result.configRepos, ["All-Projects", "All-Users"]);
});

Deno.test("project-list: the config repos come back on request", async () => {
  const { ctx } = mockCtx([projects], D);
  const result = await action.execute({ includeConfigRepos: true }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 5);
});

/** A push to a read-only project fails in terms of permissions. */
Deno.test("project-list: separates read-only and hidden projects", async () => {
  const { ctx } = mockCtx([projects], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.readOnly, ["platform/legacy"]);
  assertEquals(result.hidden, ["internal/secret"]);
});

/** A Gerrit project name is a path. */
Deno.test("project-list: keeps slashes in project names", async () => {
  const { ctx } = mockCtx([projects], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assert((result.names as string[]).includes("platform/frameworks/base"));
});

Deno.test("project-list: the filters reach Gerrit's short parameter names", async () => {
  const { ctx, calls } = mockCtx([projects], D);
  await action.execute({ prefix: "platform/", substring: "base", includeDescription: true }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("p"), "platform/");
  assertEquals(q.get("m"), "base");
  assertEquals(q.get("d"), "true");
});
