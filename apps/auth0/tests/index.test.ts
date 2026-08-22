import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as { w6w: { id: string; categories: string[]; network: { allow: string[] } } };

Deno.test("index: exports 18 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 18);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
    assert(Array.isArray(a.output) && a.output.length > 0, `${a.key} declares no output`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

Deno.test("index: the actions that duplicate on a retry say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "password-change-ticket",
    "user-create",
    "verification-email-send",
  ]);
});

/** Deleting frees the email and does not revoke tokens; blocking does neither. */
Deno.test("index: deleting a user is gated behind a confirmation", () => {
  const action = app.actions.find((a) => a.key === "user-delete")!;
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assert(confirm, "user-delete has no confirmation flag");
  assertEquals(confirm!.required, true);
});

/**
 * An application's secret has no business in a workflow's logs or variables, so
 * it is excluded from the REQUEST rather than from the output.
 */
Deno.test("index: no action can receive a client secret", async () => {
  const src = await Deno.readTextFile(new URL("../actions/client-list.ts", import.meta.url));
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const fields = code.match(/fields:\s*"([^"]+)"/)?.[1] ?? "";
  assert(fields.length > 0, "client-list does not pin a field list");
  assert(!fields.includes("client_secret"), fields);
});

/** Only the auth hook may hold a credential. */
Deno.test("index: no action outside auth/ builds or reads a credential", async () => {
  for (const dir of ["actions", "lib", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.name.endsWith(".ts")) continue;
      const src = await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url));
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      assert(!/clientSecret|client_secret:/.test(code), `${dir}/${entry.name} touches a secret`);
      // `grant_type:` as a body key — not `grant_types`, which is a field NAME
      // client-list legitimately asks Auth0 to return.
      assert(!/grant_type\s*:/.test(code), `${dir}/${entry.name} mints a token`);
    }
  }
});

/** The tenant is the host, so the allowlist is a wildcard over auth0.com only. */
Deno.test("index: the egress allowlist is the canonical Auth0 domain space", () => {
  assertEquals(manifest.w6w.network.allow, ["*.auth0.com"]);
});

Deno.test("index: one auth method and two declared health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["client-credentials"]);
  assertEquals(app.healthChecks!.map((h) => h.key).sort(), ["service", "tenant"]);
});

Deno.test("index: the manifest's categories are in the controlled vocabulary", () => {
  assertEquals(manifest.w6w.id, "io.w6w.auth0");
  assertEquals(manifest.w6w.categories, ["security", "developer-tools"]);
});
