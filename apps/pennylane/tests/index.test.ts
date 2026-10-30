import { denoReadFile, denoReadTextFile, denoStat } from "./_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "./_assert.ts";
import app from "../index.ts";

/** The 22 actions this app ships, exactly — no more, no fewer. */
const ACTION_KEYS = [
  "list-customers",
  "get-customer",
  "create-company-customer",
  "create-individual-customer",
  "list-suppliers",
  "get-supplier",
  "create-supplier",
  "list-products",
  "get-product",
  "create-product",
  "list-customer-invoices",
  "get-customer-invoice",
  "create-customer-invoice",
  "send-customer-invoice-by-email",
  "list-supplier-invoices",
  "get-supplier-invoice",
  "list-journals",
  "get-journal",
  "list-ledger-accounts",
  "list-categories",
  "list-transactions",
  "get-me",
];

test("index: wires up the 22 actions, the one auth method and both health checks", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.length, 22);
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 2);
  assertEquals(app.actions.map((a) => a.key).sort(), [...ACTION_KEYS].sort());
  assertEquals(app.auth.map((a) => a.key), ["oauth2"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

test("index: every action key is unique, kebab-case, and has a unit test on disk", async () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `${key} is not kebab-case`);
    const file = await denoStat(new URL(`./actions/${key}.test.ts`, import.meta.url))
      .catch(() => null);
    assert(file?.isFile, `tests/actions/${key}.test.ts is missing`);
  }
});

test("index: every action is declared well enough to render", () => {
  for (const action of app.actions) {
    assert(action.title && action.title.length > 0, `${action.key}: no title`);
    assert(action.description && action.description.length > 0, `${action.key}: no description`);
    assert(action.output !== undefined, `${action.key}: no output fields declared`);
    if (action.type === "perform") {
      assertEquals(
        typeof action.idempotent,
        "boolean",
        `${action.key}: a perform action must declare idempotent`,
      );
    }
    for (const param of action.params ?? []) {
      assert(param.key && param.label, `${action.key}: a param is missing key or label`);
      if (param.type === "select") {
        assert(
          Array.isArray(param.options) && param.options.length > 0,
          `${action.key}#${param.key}: a select with no options`,
        );
      }
      if (param.type === "group") {
        assert(
          Array.isArray(param.children) && param.children.length > 0,
          `${action.key}#${param.key}: a group with no children falls back to a JSON editor`,
        );
      }
    }
  }
});

test("index: no action touches the credential — only the auth hooks may", async () => {
  for (const key of ACTION_KEYS) {
    const src = await denoReadTextFile(new URL(`../actions/${key}.ts`, import.meta.url));
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert(!/authorization/i.test(code), `${key}: sets an Authorization header`);
    assert(!/accessToken/.test(code), `${key}: reads the access token`);
  }
});

test("index: every health check has exactly one of check/unavailable, and a title", () => {
  for (const check of app.healthChecks) {
    const hasProbe = typeof check.check === "function";
    const declaredAbsent = typeof check.unavailable?.reason === "string";
    assert(hasProbe !== declaredAbsent, `${check.key}: must have exactly one of check/unavailable`);
    assert(check.title && check.title.length > 0, `${check.key}: no title`);
  }
});

test("index: any health check widening egress is unsigned", () => {
  const widening = app.healthChecks.filter((h) => h.network?.allow?.length);
  assertEquals(widening.map((h) => h.key), ["service"]);
  for (const check of widening) {
    assert(
      check.credential === "none" || check.credential === "context",
      `${check.key}: widens egress while signed`,
    );
  }
});

test("index: the quota check is informational so an unreadable header cannot pin the app", () => {
  const quota = app.healthChecks.find((h) => h.key === "quota");
  assertEquals(quota?.severity, "informational");
});

test("index: the manifest is Pennylane's, with both hosts it calls declared", async () => {
  const pkg = JSON.parse(
    await denoReadTextFile(new URL("../package.json", import.meta.url)),
  ) as {
    name: string;
    w6w: {
      id: string;
      displayName: string;
      categories: string[];
      entry: string;
      network: { allow: string[] };
      appearance: {
        icon: { url?: string; svg?: string; sizes?: Record<string, string>; alt?: string };
      };
    };
  };

  assertEquals(pkg.name, "@w6w-apps/pennylane");
  assertEquals(pkg.w6w.id, "io.w6w.pennylane");
  assertEquals(pkg.w6w.displayName, "Pennylane");
  assertEquals(pkg.w6w.entry, "./index.ts");
  // `accounting` is not in the controlled vocabulary (core/rfcs/categories.md);
  // `finance` is the slug that covers Finance & Accounting, as QuickBooks and
  // Xero also use.
  assertEquals(pkg.w6w.categories, ["finance"]);
  // Exactly the two hosts this app calls: the API + OAuth endpoints on
  // app.pennylane.com, and the status page the service check reads.
  assertEquals(pkg.w6w.network.allow, ["app.pennylane.com", "status.pennylane.com"]);
  assertEquals(pkg.w6w.appearance.icon.url, "./assets/icon.png");
  assertEquals(pkg.w6w.appearance.icon.svg, undefined);
  assertEquals(pkg.w6w.appearance.icon.alt, "Pennylane");
  assertEquals(pkg.w6w.appearance.icon.sizes, { "48x48": "./assets/icon.png" });
});

test("index: the icon is a real 48x48 PNG, the vendor's own raster", async () => {
  const bytes = await denoReadFile(new URL("../assets/icon.png", import.meta.url));
  assertEquals(
    [...bytes.slice(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
    "assets/icon.png is not a PNG",
  );
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // IHDR is the first chunk: length(4) type(4) width(4) height(4).
  assertEquals(view.getUint32(12), 0x49484452, "the first chunk is not IHDR");
  assertEquals(view.getUint32(16), 48, "icon width");
  assertEquals(view.getUint32(20), 48, "icon height");
});
