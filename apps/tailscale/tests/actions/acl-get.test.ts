import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/acl-get.ts";

const hujson = `{
  // Who may reach production. Do not widen without asking security.
  "groups": {
    "group:eng": ["ada@example.com"],
  },
  "tagOwners": {
    "tag:prod": ["group:eng"],
    "tag:ci": ["group:eng"],
  },
  "acls": [
    {"action": "accept", "users": ["group:eng"], "ports": ["tag:prod:22"]},
  ],
  "tests": [
    {"src": "ada@example.com", "accept": ["tag:prod:22"]},
  ],
}`;

const details = {
  status: 200,
  body: { acl: "…", warnings: ['"group:eng": user not found: "ada@example.com"'], errors: null },
};

/** The comments are the reasoning; the JSON form drops them. */
Deno.test("acl-get: asks for HuJSON and returns it verbatim", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: hujson }, details]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;

  assertEquals(calls[0].headers["accept"], "application/hujson");
  assertEquals(result.hujson, hujson);
  assert(String(result.hujson).includes("// Who may reach production"), "the comments survived");
});

/** `details=true` is the only way to see them, and it forbids an Accept header. */
Deno.test("acl-get: reads the warnings from the details call and warns", async () => {
  const { ctx, calls, logs } = mockCtx([{ status: 200, body: hujson }, details]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;

  assertEquals(new URL(calls[1].url).searchParams.get("details"), "true");
  assertEquals(calls[1].headers["accept"], "application/json");
  assertEquals((result.warnings as string[]).length, 1);
  assert(
    logs.some((l) => l.level === "warn" && /nonsensical/.test(l.message)),
    JSON.stringify(logs),
  );
});

Deno.test("acl-get: counts rules, tests, tags and groups from the text alone", async () => {
  const { ctx } = mockCtx([{ status: 200, body: hujson }, details]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.tagOwners, ["tag:prod", "tag:ci"]);
  assertEquals(result.groups, ["group:eng"]);
  assertEquals(result.ruleCount, 1);
  assertEquals(result.testCount, 1);
});

/** The parsed form is an explicit, lossy extra. */
Deno.test("acl-get: the JSON form is fetched only when asked for", async () => {
  const without = mockCtx([{ status: 200, body: hujson }, details]);
  const plain = await action.execute({}, without.ctx) as Record<string, unknown>;
  assertEquals(without.calls.length, 2);
  assertEquals(plain.parsed, undefined);

  const parsed = {
    status: 200,
    body: { acls: [{ action: "accept" }], tests: [], tagOwners: { "tag:prod": [] }, groups: {} },
  };
  const withParsed = mockCtx([{ status: 200, body: hujson }, details, parsed]);
  const result = await action.execute({ includeParsed: true }, withParsed.ctx) as Record<
    string,
    unknown
  >;
  assertEquals(withParsed.calls[2].headers["accept"], "application/json");
  assertEquals(result.ruleCount, 1);
  assertEquals(result.tagOwners, ["tag:prod"]);
});

Deno.test("acl-get: no warnings means no warning log", async () => {
  const { ctx, logs } = mockCtx([
    { status: 200, body: hujson },
    { status: 200, body: { warnings: [], errors: [] } },
  ]);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.warnings, []);
  assertEquals(logs.length, 0);
});

Deno.test("acl-get: says why the HuJSON form is the default", () => {
  assert(/drops every comment/.test(action.description!), action.description);
  assertEquals(action.type, "read");
});
