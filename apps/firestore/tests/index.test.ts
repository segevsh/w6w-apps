import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    displayName: string;
    categories: string[];
    network: { allow: string[] };
    appearance: {
      icon: { svg: string; alt?: string };
      darkMode?: { icon: { svg: string; alt?: string } };
    };
  };
};

Deno.test("index: exports 12 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 12);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  const validTypes = new Set(["read", "search", "perform", "control"]);
  for (const action of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(action.key), `bad key: ${action.key}`);
    assert(validTypes.has(action.type), `bad type on ${action.key}`);
    assert(action.description !== undefined, `missing description on ${action.key}`);
  }
});

Deno.test("index: every action the contract requires is present", () => {
  const keys = app.actions.map((a) => a.key);
  for (
    const required of [
      "document-get",
      "document-create",
      "document-update",
      "document-delete",
      "document-list",
      "collection-list-ids",
      "query-run",
      "documents-batch-get",
      "documents-commit",
      "database-get",
    ]
  ) {
    assert(keys.includes(required), `missing action: ${required}`);
  }
});

Deno.test("index: every perform action declares idempotency", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    assert(
      action.idempotent !== undefined,
      `${action.key} is perform without \`idempotent\``,
    );
  }
});

Deno.test("index: exports one auth method and both health checks", () => {
  assertEquals((app.auth ?? []).map((a) => a.key), ["oauth2"]);
  assertEquals((app.healthChecks ?? []).map((c) => c.key).sort(), ["quota", "service"]);
});

Deno.test("index: the manifest allowlists the API host and the token host only", () => {
  assertEquals(manifest.w6w.id, "io.w6w.firestore");
  assertEquals(manifest.w6w.displayName, "Firestore");
  assertEquals(manifest.w6w.network.allow, [
    "firestore.googleapis.com",
    "oauth2.googleapis.com",
  ]);
  // `www.googleapis.com` is the scope-URN namespace, never fetched — allowing it
  // would widen the sandbox to every Google service.
  assert(!manifest.w6w.network.allow.includes("www.googleapis.com"));
  // The status host belongs to the unsigned `service` check, which declares it.
  assert(!manifest.w6w.network.allow.includes("status.cloud.google.com"));
  assertEquals(manifest.w6w.categories, ["databases", "developer-tools"]);
});

Deno.test("index: the icon is the vendor's mark, verbatim, with a legible dark variant", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  // The simple-icons Firebase mark exactly as sourced — Firebase has no separate
  // Firestore glyph, so Firebase's is the mark.
  assert(
    svg.startsWith('<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">'),
    "icon.svg is not the verbatim simple-icons Firebase mark",
  );
  assert(svg.includes("<title>Firebase</title>"), "the mark no longer names Firebase");
  assert(manifest.w6w.appearance.icon.svg === "./assets/icon.svg");
  assert(manifest.w6w.appearance.icon.alt === "Firestore");

  // It paints with SVG's black initial value, so a dark-tile variant is required
  // for the mark to be visible there; it is the same artwork, re-inked to white.
  const darkRef = manifest.w6w.appearance.darkMode?.icon.svg;
  assertEquals(darkRef, "./assets/icon.dark.svg");
  const dark = await Deno.readTextFile(new URL(`..${darkRef!.slice(1)}`, import.meta.url));
  assert(dark.startsWith('<svg fill="#ffffff"'), "the dark variant is not the white re-ink");
  assert(dark.includes(svg.slice(svg.indexOf("<title>"))), "the dark variant changed the artwork");
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
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
