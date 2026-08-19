import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as {
  w6w: { id: string; network: { allow: string[] }; categories: string[] };
};

Deno.test("index: exports 15 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 15);
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const a of app.actions) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.key), `${a.key} is not kebab-case`);
    assert(
      ["read", "search", "perform", "trigger"].includes(a.type),
      `${a.key} has type ${a.type}`,
    );
    assert(a.title.length > 0 && a.description!.length > 0, `${a.key} lacks title or description`);
  }
});

Deno.test("index: every perform action declares idempotent explicitly", () => {
  for (const a of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof a.idempotent, "boolean", `${a.key} does not declare idempotent`);
  }
});

/** A retry makes a second droplet, a second snapshot, a second DNS record. */
Deno.test("index: only the three that create new billable things are non-idempotent", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, ["domain-record-create", "droplet-create", "snapshot-create"]);
});

Deno.test("index: exports the one auth method and both health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["token"]);
  assertEquals(app.healthChecks!.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: the manifest allows only the API and the status page", () => {
  assertEquals(manifest.w6w.network.allow, [
    "api.digitalocean.com",
    "status.digitalocean.com",
  ]);
  assertEquals(manifest.w6w.id, "io.w6w.digitalocean");
  assertEquals(manifest.w6w.categories, ["devops", "storage"]);
});

/** The paths that destroy, cost or cannot be undone. */
Deno.test("index: every irreversible or expensive path is gated", () => {
  const params = (key: string) =>
    (app.actions.find((a) => a.key === key)!.params as Array<{ key: string }>).map((p) => p.key);

  // Destroys the droplet and orphans its volumes.
  assert(params("droplet-delete").includes("confirmName"), "droplet-delete has no name gate");
  assert(
    params("droplet-delete").includes("acknowledgeOrphans"),
    "droplet-delete does not make you look at the volumes",
  );
  // Cuts the power rather than asking the OS to stop.
  assert(params("droplet-power").includes("confirmHardPower"), "droplet-power has no gate");
  // Grows the disk permanently.
  assert(params("droplet-resize").includes("confirmPermanent"), "droplet-resize has no gate");
  // Emails a root password in plain text.
  assert(params("droplet-create").includes("confirmNoSshKeys"), "droplet-create has no gate");
});

/** The billing facts this app exists to surface. */
Deno.test("index: the three billing surprises are each stated by an action", () => {
  const description = (key: string) => app.actions.find((a) => a.key === key)!.description!;
  // A powered-off droplet still bills.
  assert(/STILL BILLING/.test(description("droplet-list")), description("droplet-list"));
  // Volumes and snapshots outlive the droplet.
  assert(/survive and keep billing/.test(description("droplet-delete")));
  // An unassigned reserved IP is the one that costs.
  assert(/inverse of the usual rule/.test(description("reserved-ip-list")));
});

/**
 * The sandbox rules that can only be seen in source. `_tools/audit.ts` checks
 * these pack-wide; asserting them here means this app's own suite fails first.
 */
const code = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    // Prose in a param hint or an output label is not code. Concatenated
    // continuations count too, or half a two-line description survives.
    .replace(
      /\b(hint|description|label|placeholder|title|reason|message)\s*:\s*"(?:[^"\\]|\\.)*"(?:\s*\+\s*"(?:[^"\\]|\\.)*")*/g,
      "",
    );

const sources = async (dir: string) => {
  const out: Array<[string, string]> = [];
  for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    out.push([
      `${dir}/${entry.name}`,
      code(await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url))),
    ]);
  }
  return out;
};

Deno.test("index: nothing reaches the network except through ctx.fetch", async () => {
  for (const dir of ["actions", "lib", "health"]) {
    for (const [name, src] of await sources(dir)) {
      assert(
        !/[^.\w]fetch\(/.test(src.replace(/ctx\.fetch\(/g, "")),
        `${name} calls global fetch`,
      );
      assert(!/\bDeno\./.test(src), `${name} touches Deno.*`);
      assert(!/from "node:/.test(src), `${name} imports a node module`);
      assert(!/\bimport\s*\(/.test(src), `${name} uses a dynamic import`);
    }
  }
});

Deno.test("index: no action handles a credential — signing is the auth hook's job", async () => {
  for (const [name, src] of await sources("actions")) {
    assert(!/authorization/i.test(src), `${name} sets an authorization header`);
    assert(
      !/\bcredential\s*(?:\.|;|\)|\}|,|:|as\b)/i.test(src),
      `${name} reads the credential`,
    );
  }
});

/**
 * A database connection URI embeds the admin password and a TXT record carries
 * verification tokens. A run log records names and counts.
 */
Deno.test("index: nothing logs a connection URI, DNS data or user data", async () => {
  for (const dir of ["actions", "lib"]) {
    for (const [name, src] of await sources(dir)) {
      const logs = src.match(/ctx\.log\([^,]*,[^,]*,\s*(\{[^;]*?\})\s*\)/gs) ?? [];
      for (const call of logs) {
        const object = call.slice(call.indexOf("{"));
        // The VALUES, not the keys: `count: droplets.length` is a count and
        // `droplets: droplets` is the records themselves.
        for (
          const forbidden of [
            /:\s*(?:uri|connection|data|userData|user_data|password|droplets|databases|records)\s*[,}]/i,
            /[{,]\s*(?:uri|connection|data|userData|user_data|password|droplets|databases|records)\s*[,}]/i,
          ]
        ) {
          assert(!forbidden.test(object), `${name} logs a credential or a payload: ${object}`);
        }
      }
    }
  }
});

Deno.test("index: the comment stripper actually strips, so the guards above mean something", () => {
  assertEquals(code("/* credential */ const a = 1;").trim(), "const a = 1;");
  assertEquals(code("// authorization\nconst a = 1;").trim(), "const a = 1;");
  assertEquals(code('hint: "reads the credential",').trim(), ",");
  assertEquals(code('description: "a" +\n    "credential",').trim(), ",");
});
