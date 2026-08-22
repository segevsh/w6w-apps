import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as { w6w: { id: string; categories: string[]; network: { allow: string[] } } };

Deno.test("index: exports 14 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 14);
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

Deno.test("index: the actions that cost or create something say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "link-token-create",
    "public-token-exchange",
    "sandbox-item-create",
    "transaction-refresh",
  ]);
});

/**
 * A date-range read cannot express an amended or removed transaction, so this
 * app implements sync and nothing else.
 */
Deno.test("index: nothing calls the legacy date-range transactions endpoint", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert(!/"\/transactions\/get"/.test(code), `${entry.name} calls /transactions/get`);
  }
});

/** Only the sign hook may hold the client credentials. */
Deno.test("index: no action outside auth/ touches client_id or secret", async () => {
  for (const dir of ["actions", "lib", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.name.endsWith(".ts")) continue;
      const src = await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url));
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      assert(!/client_id:/.test(code), `${dir}/${entry.name} sets client_id`);
      assert(!/\bsecret:/.test(code), `${dir}/${entry.name} sets a secret`);
    }
  }
});

/** An access token reads somebody's bank data — it is a secret everywhere. */
Deno.test("index: every access-token param is declared secret", () => {
  for (const action of app.actions) {
    const p = (action.params as Array<{ key: string; type: string }> | undefined)
      ?.find((p) => p.key === "accessToken" || p.key === "publicToken");
    if (!p) continue;
    assertEquals(p.type, "secret", `${action.key}'s ${p.key} is not secret`);
  }
});

/** Disconnecting somebody's bank is gated. */
Deno.test("index: removing an Item requires a confirmation", () => {
  const action = app.actions.find((a) => a.key === "item-remove")!;
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assert(confirm, "item-remove has no confirmation flag");
  assertEquals(confirm!.required, true);
});

/** `development.plaid.com` no longer resolves. */
Deno.test("index: the egress allowlist has only the two live environments", () => {
  assertEquals(manifest.w6w.network.allow, ["sandbox.plaid.com", "production.plaid.com"]);
});

Deno.test("index: two auth methods and two declared health checks", () => {
  assertEquals(app.auth!.map((a) => a.key).sort(), ["client-secret", "client-secret-sandbox"]);
  assertEquals(app.healthChecks!.map((h) => h.key).sort(), ["credentials", "service"]);
});

Deno.test("index: the manifest's categories are in the controlled vocabulary", () => {
  assertEquals(manifest.w6w.id, "io.w6w.plaid");
  assertEquals(manifest.w6w.categories, ["finance", "databases"]);
});
