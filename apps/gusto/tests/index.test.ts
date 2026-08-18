import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const manifest = JSON.parse(
  await Deno.readTextFile(new URL("../package.json", import.meta.url)),
) as { w6w: { id: string; categories: string[]; network: { allow: string[] } } };

Deno.test("index: exports 23 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 23);
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
  assertEquals(notIdempotent, ["department-create", "employee-create", "employee-terminate"]);
});

/**
 * Gusto's optimistic lock is the safety model. Every write must carry a
 * caller-supplied version — an action that re-read and forced the write would
 * be overwriting a change nobody saw.
 */
Deno.test("index: every write takes a version rather than fetching one", () => {
  for (const key of ["employee-update", "department-people-add"]) {
    const action = app.actions.find((a) => a.key === key)!;
    const version = (action.params as Array<{ key: string; required?: boolean }>)
      .find((p) => p.key === "version");
    assert(version, `${key} has no version param`);
    assertEquals(version!.required, true, `${key}'s version should be required`);
  }
});

/** Payroll damage is somebody not being paid. The narrowing is deliberate. */
Deno.test("index: no action submits or approves a payroll", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    assert(!/\/submit|\/calculate|\/prepare/.test(code), `${entry.name} touches a payroll write`);
  }
});

/**
 * An SSN or a bank account moving through a workflow is a liability nobody
 * asked for. Prose *about* them is the point — what must not exist is a field
 * that puts one on the wire.
 */
Deno.test("index: no action puts an SSN or bank details on the wire", async () => {
  for await (const entry of Deno.readDir(new URL("../actions", import.meta.url))) {
    if (!entry.name.endsWith(".ts")) continue;
    const src = await Deno.readTextFile(new URL(`../actions/${entry.name}`, import.meta.url));
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "")
      // User-facing prose is documentation, not a request — the same exclusion
      // the pack's auditor makes.
      .replace(
        /(hint|description|label|placeholder|title):\s*"(?:[^"\\]|\\.)*"(?:\s*\+\s*"(?:[^"\\]|\\.)*")*/g,
        "",
      );
    assert(!/\bssn\b/i.test(code), `${entry.name} sends an SSN`);
    assert(
      !/routing_number|account_number|bank_account/i.test(code),
      `${entry.name} sends bank details`,
    );
  }
});

/** Terminating a person and creating a department are different weights. */
Deno.test("index: terminating requires an explicit confirmation", () => {
  const action = app.actions.find((a) => a.key === "employee-terminate")!;
  const confirm = (action.params as Array<{ key: string; required?: boolean }>)
    .find((p) => p.key === "confirm");
  assert(confirm, "employee-terminate has no confirmation flag");
  assertEquals(confirm!.required, true);
});

/**
 * Measured 2026-08-18: without the header Gusto serves a version deprecated in
 * July 2024.
 */
Deno.test("index: the API version is pinned in exactly one place", async () => {
  const client = await Deno.readTextFile(new URL("../lib/client.ts", import.meta.url));
  assert(/API_VERSION = "2026-06-15"/.test(client), "the version is not pinned");
  assert(
    /"x-gusto-api-version": API_VERSION/.test(client),
    "the client does not send the version header",
  );
});

Deno.test("index: the egress allowlist names both environments", () => {
  assertEquals(manifest.w6w.network.allow, ["api.gusto.com", "api.gusto-demo.com"]);
});

Deno.test("index: nothing calls a host outside the allowlist", async () => {
  for (const dir of ["actions", "auth", "lib"]) {
    for await (const entry of Deno.readDir(new URL(`../${dir}`, import.meta.url))) {
      if (!entry.name.endsWith(".ts")) continue;
      const src = await Deno.readTextFile(new URL(`../${dir}/${entry.name}`, import.meta.url));
      const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      for (const m of code.matchAll(/https:\/\/([a-z0-9.-]+)/g)) {
        assert(
          ["api.gusto.com", "api.gusto-demo.com"].includes(m[1]),
          `${dir}/${entry.name} reaches ${m[1]}`,
        );
      }
    }
  }
});

Deno.test("index: two auth methods and two declared health checks", () => {
  assertEquals(app.auth!.map((a) => a.key), ["oauth2", "oauth2-demo"]);
  assertEquals(app.healthChecks!.map((h) => h.key).sort(), ["api-version", "service"]);
});

Deno.test("index: the manifest's categories are in the controlled vocabulary", () => {
  assertEquals(manifest.w6w.id, "io.w6w.gusto");
  assertEquals(manifest.w6w.categories, ["hr", "finance", "productivity"]);
});
