import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/token.ts";

const credential = {
  token: "sk-abc",
  projectId: "abc123",
  dataset: "production",
  useCdn: false,
};

Deno.test("token: signs as a Bearer token", async () => {
  const { ctx } = mockCtx();
  const request = {
    url: "https://abc123.api.sanity.io/v2025-02-19/data/query/production",
    method: "GET" as const,
    headers: {} as Record<string, string>,
  };
  const out = await auth.sign!({ request, credential }, ctx);
  assertEquals(out.headers["authorization"], "Bearer sk-abc");
});

/** The management API proves the token reaches THIS project. */
Deno.test("token: test reads the project from the management API", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { displayName: "Acme Content" } }]);
  const out = await auth.test!({ credential }, ctx);
  assertEquals(out.ok, true);
  assert(out.message!.includes("Acme Content"), out.message);
  assertEquals(new URL(calls[0].url).host, "api.sanity.io");
  assertEquals(new URL(calls[0].url).pathname, "/v2025-02-19/projects/abc123");
});

Deno.test("token: a 404 names the project rather than blaming the token", async () => {
  const { ctx } = mockCtx([{ status: 404, body: "" }]);
  const out = await auth.test!({ credential }, ctx);
  assertEquals(out.ok, false);
  assert(/no project "abc123"/.test(out.message!), out.message);
});

Deno.test("token: a 401 mentions the other-project case", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "" }]);
  const out = await auth.test!({ credential }, ctx);
  assertEquals(out.ok, false);
  assert(/another project/.test(out.message!), out.message);
});

Deno.test("token: a missing project never reaches the network", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test!({ credential: { token: "x" } }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

Deno.test("token: afterConnect records what a URL needs, never the token", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { displayName: "Acme Content" } }]);
  const display = await auth.afterConnect!({ credential }, ctx) as Record<string, unknown>;
  assertEquals(display.projectId, "abc123");
  assertEquals(display.dataset, "production");
  assertEquals(display.useCdn, false);
  assertEquals(display.projectName, "Acme Content");
  assert(!JSON.stringify(display).includes("sk-abc"));
});

Deno.test("token: the dataset defaults to production", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "" }]);
  const display = await auth.afterConnect!(
    { credential: { token: "x", projectId: "abc123" } },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(display.dataset, "production");
});

/** Sanity's own advice: an integration should read the live API. */
Deno.test("token: the CDN is off by default, and the hint says why", () => {
  const f = auth.fields!.find((f) => f.key === "useCdn")!;
  assertEquals(f.default, false);
  assert(/two hours/.test(f.hint!), f.hint);
});

Deno.test("token: the token field is declared secret", () => {
  assertEquals(auth.fields!.find((f) => f.key === "token")!.type, "secret");
});
