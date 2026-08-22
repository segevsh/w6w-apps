import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import auth from "../../auth/api-key.ts";

const projects = (list: unknown[]) => ({ status: 200, body: { projects: list } });

/** `Token`, not `Bearer` — Bearer is for the JWT that token-grant mints. */
Deno.test("api-key: sign uses the Token scheme, not Bearer", () => {
  const request = { url: "https://api.deepgram.com/v1/projects", method: "GET", headers: {} };
  const signed = auth.sign!({ request, credential: { apiKey: "dg_1" } }, mockCtx().ctx) as {
    headers: Record<string, string>;
  };
  assertEquals(signed.headers["authorization"], "Token dg_1");
});

Deno.test("api-key: test names the project the key reaches", async () => {
  const { ctx, calls } = mockCtx([projects([{ project_id: "p1", name: "Acme" }])]);
  const result = await auth.test!({ credential: { apiKey: "dg_1" } }, ctx);
  assertEquals(calls[0].url, "https://api.deepgram.com/v1/projects");
  assertEquals(result.ok, true);
  assert(result.message!.includes("Acme"), result.message);
});

Deno.test("api-key: several projects connect, saying the first is used", async () => {
  const { ctx } = mockCtx([
    projects([{ project_id: "p1", name: "A" }, { project_id: "p2", name: "B" }]),
  ]);
  const result = await auth.test!({ credential: { apiKey: "dg_1" } }, ctx);
  assertEquals(result.ok, true);
  assert(/the first is used/.test(result.message!), result.message);
});

Deno.test("api-key: a key reaching no project does not connect", async () => {
  const { ctx } = mockCtx([projects([])]);
  const result = await auth.test!({ credential: { apiKey: "dg_1" } }, ctx);
  assertEquals(result.ok, false);
  assert(/reaches no project/.test(result.message!), result.message);
});

/** A narrow key may authenticate and be refused per endpoint. */
Deno.test("api-key: a 401 or 403 names the scope as a possible cause", async () => {
  for (const status of [401, 403]) {
    const { ctx } = mockCtx([{ status, body: "" }]);
    const result = await auth.test!({ credential: { apiKey: "dg_1" } }, ctx);
    assertEquals(result.ok, false);
    assert(/scope/.test(result.message!), result.message);
  }
});

Deno.test("api-key: any other failure reports the status", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const result = await auth.test!({ credential: { apiKey: "dg_1" } }, ctx);
  assertEquals(result.ok, false);
  assert(result.message!.includes("503"), result.message);
});

Deno.test("api-key: a missing credential is refused before a request is made", async () => {
  const { ctx, calls } = mockCtx();
  assertEquals((await auth.test!({ credential: {} }, ctx)).ok, false);
  assertEquals(calls.length, 0);
});

/** The project is public metadata; the key never is. */
Deno.test("api-key: afterConnect records the project, not the key", async () => {
  const { ctx } = mockCtx([projects([{ project_id: "p1", name: "Acme" }])]);
  const display = await auth.afterConnect!({ credential: { apiKey: "dg_secret" } }, ctx);
  assertEquals(display, { projectId: "p1", projectName: "Acme" });
  assert(!JSON.stringify(display).includes("dg_secret"));
});

Deno.test("api-key: afterConnect degrades quietly when discovery fails", async () => {
  const { ctx } = mockCtx([{ status: 403, body: "" }]);
  assertEquals(await auth.afterConnect!({ credential: { apiKey: "dg_1" } }, ctx), {});
});

Deno.test("api-key: declares exactly one secret field", () => {
  assertEquals(auth.fields!.map((f) => f.key), ["apiKey"]);
  assertEquals(auth.fields![0].type, "secret");
});
