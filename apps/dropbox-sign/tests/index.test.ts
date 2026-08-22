import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    network: { allow: string[] };
    appearance: { icon: { svg: string }; darkMode?: unknown };
  };
};

Deno.test("index: exports 27 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 27);
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

/** Anything that can send a second email or create a second request says so. */
Deno.test("index: the actions that duplicate on retry are honest about it", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "report-create",
    "signature-request-remind",
    "signature-request-send",
    "signature-request-send-with-template",
    "unclaimed-draft-create",
  ]);
});

Deno.test("index: exports both auth methods and both health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key", "oauth2"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

/**
 * Two hosts, and the second earns its place: OAuth's endpoints are on
 * app.hellosign.com, outside the API base.
 */
Deno.test("index: the manifest allowlists exactly the two hosts this app uses", () => {
  assertEquals(manifest.w6w.network.allow, ["api.hellosign.com", "app.hellosign.com"]);
  assertEquals(manifest.w6w.id, "io.w6w.dropbox-sign");
});

/**
 * `test_mode: false` means a legally binding signature. Every action that can
 * create one must offer the parameter, and none may quietly default it to true
 * — a workflow that looks like it sends contracts must actually send them.
 */
Deno.test("index: every creating action offers Test Mode, defaulted to the API's own value", () => {
  const creators = [
    "signature-request-send",
    "signature-request-send-with-template",
    "unclaimed-draft-create",
  ];
  for (const key of creators) {
    const action = app.actions.find((a) => a.key === key)!;
    const param = (action.params as Array<{ key: string; default?: unknown; label: string }>)
      .find((p) => p.key === "testMode");
    assert(param, `${key} does not offer testMode`);
    assertEquals(param!.default, false, `${key} overrides Dropbox Sign's default`);
    assert(param!.label.includes("legally binding"), `${key}'s label hides what off means`);
  }
});

/** Removing access to a completed request cannot be undone. */
Deno.test("index: the destructive action needs an explicit confirmation", () => {
  const remove = app.actions.find((a) => a.key === "signature-request-remove")!;
  const confirm = (remove.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm")!;
  assertEquals(confirm.required, true);
});

Deno.test("index: the icon is the vendor's mark, in the vendor's colours", async () => {
  const svg = await Deno.readTextFile(new URL("../assets/icon.svg", import.meta.url));
  assert(
    svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"'),
    "icon.svg is not on the pack's normalized canvas",
  );
  assert(svg.includes("<title>Dropbox Sign</title>"), "the mark no longer names Dropbox Sign");
  // Dropbox blue and the near-black of the Sign glyph's other half.
  assert(svg.includes('fill="#0061FE"'), "the mark lost Dropbox blue");
  assert(svg.includes('fill="#1E1919"'), "the mark lost its dark half");
  // Two-tone, so it clears both tiles without a reversed variant.
  assertEquals(manifest.w6w.appearance.darkMode, undefined);
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

/** Fax is a separate product with its own line and billing; it is out of scope. */
Deno.test("index: no action calls the fax endpoints", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = code(await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url)));
    assert(!/["'`]\/fax/.test(src), `${entry.name} calls a fax endpoint`);
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
});
