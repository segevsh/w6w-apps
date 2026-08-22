import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    network: { allow: string[] };
    appearance: { icon: { url?: string }; darkMode?: { icon: { url?: string } } };
  };
};

Deno.test("index: exports 21 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 21);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(["read", "perform", "trigger"].includes(a.type), `${a.key} has type ${a.type}`);
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** Only the two creates make a second thing on a retry. */
Deno.test("index: the actions that duplicate on a retry say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["flag-create", "segment-create"]);
});

/** Deleting a flag takes its history; archiving does not. */
Deno.test("index: the irreversible action is gated behind a confirmation", () => {
  const action = app.actions.find((a) => a.key === "flag-delete")!;
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assert(confirm, "flag-delete has no confirmation flag");
  assertEquals(confirm!.required, true);
});

/**
 * A flag change reaches production users within seconds, and the log line may
 * be the only local record of it.
 */
Deno.test("index: the flag-changing actions log at warn, not info", async () => {
  for (const name of ["flag-toggle.ts", "flag-update.ts", "flag-archive.ts", "flag-delete.ts"]) {
    const src = await Deno.readTextFile(new URL(`../actions/${name}`, import.meta.url));
    const body = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert(/ctx\.log\(\s*"warn"/.test(body), `${name} does not log its change at warn`);
  }
});

/**
 * The content type is the whole difference between an instruction body and a
 * JSON Patch, so no action may build a PATCH by hand.
 */
Deno.test("index: every semantic write goes through the one code path", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const body = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    if (!body.includes("instructions")) continue;
    assert(
      body.includes("semanticPatch"),
      `${entry.name} builds an instruction body without semanticPatch`,
    );
    assert(
      !/method:\s*"PATCH"/.test(body),
      `${entry.name} hand-rolls a PATCH — the content type would be wrong`,
    );
  }
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

/** An account lives in one instance or the other, so both hosts are allowed. */
Deno.test("index: the manifest allowlists both instances", () => {
  assertEquals(manifest.w6w.network.allow, ["app.launchdarkly.com", "app.launchdarkly.us"]);
  assertEquals(manifest.w6w.id, "io.w6w.launchdarkly");
});

/**
 * LaunchDarkly's mark is a near-black glyph, which is invisible on the pack's
 * dark tile — so it ships the reversed variant every brand guide specifies.
 */
Deno.test("index: the icon ships a dark variant, because the mark is near-black", () => {
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
  assertEquals(manifest.w6w.appearance.darkMode!.icon.url, "./assets/icon.dark.png");
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

/** An environment response carries SDK keys; nothing may log the response. */
Deno.test("index: environment-get logs only the identifiers", async () => {
  const src = code(
    await Deno.readTextFile(new URL("../actions/environment-get.ts", import.meta.url)),
  );
  const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
  assert(logs.length > 0, "the log-data matcher found nothing to check");
  for (const call of logs) {
    const object = call.slice(call.indexOf("{"));
    assert(
      !/apiKey|mobileKey|result|body/.test(object),
      `logs more than the identifiers: ${object}`,
    );
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
});
