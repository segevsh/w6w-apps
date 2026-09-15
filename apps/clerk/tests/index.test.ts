import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as { w6w: { id: string; categories: string[]; network: { allow: string[] } } };

Deno.test("index: exports 30 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 30);
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

/** Creating something new (a user, an org, an invitation, a token) is never safe to retry blindly. */
Deno.test("index: the actions that duplicate on a retry say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "invitation-create",
    "organization-create",
    "organization-invitation-create",
    "organization-membership-create",
    "sign-in-token-create",
    "user-create",
  ]);
});

/** Deleting a user frees their identifier for reuse and does not revoke tokens — irreversible. */
Deno.test("index: user-delete is gated behind a confirmation", () => {
  const action = app.actions.find((a) => a.key === "user-delete")!;
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assert(confirm, "user-delete has no confirmation flag");
  assertEquals(confirm!.required, true);
});

/** Deleting an organization cascades to its memberships and invitations — irreversible. */
Deno.test("index: organization-delete is gated behind a confirmation", () => {
  const action = app.actions.find((a) => a.key === "organization-delete")!;
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assert(confirm, "organization-delete has no confirmation flag");
  assertEquals(confirm!.required, true);
});

/** Only the auth hook may hold the Secret Key. */
Deno.test("index: no action outside auth/ reads or builds a credential", async () => {
  for (const dir of ["actions", "lib", "health"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.name.endsWith(".ts")) continue;
      const src = await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url));
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      assert(!/secretKey\s*[:=]\s*["'`]sk_/.test(code), `${dir}/${entry.name} hardcodes a key`);
      assert(
        !/authorization["']?\s*:\s*`Bearer/i.test(code),
        `${dir}/${entry.name} signs a request`,
      );
    }
  }
});

/** Every Action calls only the declared host; nothing reaches status.clerk.com directly. */
Deno.test("index: the egress allowlist is exactly api.clerk.com", () => {
  assertEquals(manifest.w6w.network.allow, ["api.clerk.com"]);
});

Deno.test("index: one auth method and two declared health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["secret-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key).sort(), ["instance", "service"]);
});

Deno.test("index: the manifest's categories are in the controlled vocabulary", () => {
  assertEquals(manifest.w6w.id, "io.w6w.clerk");
  assertEquals(manifest.w6w.categories, ["security", "developer-tools"]);
});

/** The `{ data, totalCount? }` output shape is deliberately uniform across every list action. */
Deno.test("index: every list-shaped action normalises its output to `data`", () => {
  const listActions = app.actions.filter((a) => a.key.endsWith("-list"));
  assert(listActions.length >= 7, "expected at least 7 list actions");
  for (const a of listActions) {
    const keys = (a.output as Array<{ key: string }>).map((o) => o.key);
    assert(keys.includes("data"), `${a.key} output does not declare \`data\``);
  }
});
