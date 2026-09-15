import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; appearance: { darkMode?: unknown } };
};

Deno.test("index: exports 23 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 23);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "search", "perform"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Anything that duplicates a side effect on a retry says so. */
Deno.test("index: the actions that duplicate on a retry are honest about it", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(
    notIdempotent,
    [
      "contact-log-create",
      "donation-create",
      "event-create",
      "event-rsvp-create",
      "list-create",
      "person-create",
      "person-tag-add",
      "tag-create",
    ].sort(),
  );
});

/** The one destructive action is gated behind an explicit confirmation. */
Deno.test("index: person-delete is gated behind a confirmation", () => {
  const action = app.actions.find((a) => a.key === "person-delete")!;
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assert(confirm, "person-delete has no confirmation flag");
  assertEquals(confirm!.required, true);
});

/** Nothing else in this app can delete a person's history. */
Deno.test("index: no other action deletes anything", () => {
  const destructive = app.actions.filter((a) =>
    a.key.includes("delete") && a.key !== "person-delete"
  );
  assertEquals(destructive, []);
});

Deno.test("index: exports both auth methods and all three health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["oauth2", "api-token"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota", "nation"]);
});

/** Every nation has its own host, so the app allows the whole apex's subdomains. */
Deno.test("index: the manifest allowlists *.nationbuilder.com, not a bare wildcard", () => {
  assertEquals(manifest.w6w.network.allow, ["*.nationbuilder.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.nationbuilder");
});

Deno.test("index: the icon is the vendor's mark", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.startsWith("<svg"), "icon.svg does not start with an <svg> tag");
  assert(svg.includes("viewBox"), "icon.svg has no viewBox");
  assertEquals(manifest.w6w.appearance.darkMode, undefined);
});

// --- sandbox rules that can only be seen in source; asserting them here means
// this app's own suite fails first, ahead of `_tools/audit.ts`'s pack-wide check.
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

Deno.test("index: no action reaches the network except through ctx.fetch", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(
      !/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "")),
      `${entry.name} calls global fetch`,
    );
    assert(!/\bDeno\./.test(src), `${entry.name} touches Deno.*`);
  }
});

Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/authorization/i.test(src), `${entry.name} sets an authorization header`);
    assert(!/credential/i.test(src), `${entry.name} reads the credential`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
});
