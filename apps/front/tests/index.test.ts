import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: {
    id: string;
    categories: string[];
    network: { allow: string[] };
    appearance: { icon: { url?: string }; darkMode?: { icon: { url?: string } } };
  };
};

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

/** Anything that sends a second message, or creates a second thing. */
Deno.test("index: the actions that duplicate on a retry say so", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "contact-create",
    "contact-note-add",
    "conversation-comment-add",
    "conversation-create",
    "conversation-reply",
    "message-send",
  ]);
});

/**
 * The headline safety property: Front's `options.archive` defaults to TRUE, so
 * every action that sends must state the flag rather than inherit it.
 */
Deno.test("index: both sending actions always send `archive` explicitly", async () => {
  for (const name of ["conversation-reply", "message-send"]) {
    const src = await Deno.readTextFile(new URL(`../actions/${name}.ts`, import.meta.url));
    assert(/options:\s*\{\s*archive/.test(src), `${name} does not set options.archive`);
    assert(src.includes("p.archive === true"), `${name} does not read the archive param`);
  }
});

/**
 * `PATCH /conversations/{id}`'s `tag_ids` REPLACES the tag set. No action may
 * send it — tagging goes through the additive routes.
 */
Deno.test("index: no action sends the destructive tag_ids field on a conversation update", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    // Prose about the field is the point; only code counts.
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    if (!/method: "PATCH"/.test(code)) continue;
    assert(!/tag_ids/.test(code), `${entry.name} sends tag_ids on a PATCH`);
  }
});

/** Every request must be able to reach the one host the manifest allows. */
Deno.test("index: nothing calls a host outside the egress allowlist", async () => {
  assertEquals(manifest.w6w.network.allow, ["api2.frontapp.com"]);
  for (const dir of ["actions", "auth", "lib"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.name.endsWith(".ts")) continue;
      const src = await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url));
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      for (const m of code.matchAll(/https:\/\/([a-z0-9.-]+)/g)) {
        assert(
          m[1] === "api2.frontapp.com" || m[1].endsWith("example.com") || m[1].endsWith(".test"),
          `${dir}/${entry.name} reaches ${m[1]}`,
        );
      }
    }
  }
});

Deno.test("index: one auth method and two declared health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["api-token"]);
  assertEquals(app.healthChecks!.map((h) => h.key).sort(), ["quota", "service"]);
});

Deno.test("index: the manifest's categories are in the controlled vocabulary", () => {
  assertEquals(manifest.w6w.id, "io.w6w.front");
  assertEquals(manifest.w6w.categories, ["support", "communication", "productivity"]);
  assert(manifest.w6w.appearance.icon.url, "no icon declared");
});

/** Attachments are multipart binary the sandbox cannot produce. */
Deno.test("index: no action tries to send multipart form data", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    assert(!/new FormData\(/.test(src), `${entry.name} builds a multipart body`);
  }
});
