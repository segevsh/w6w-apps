import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const PKG = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));

const KEYS = [
  "person-profile-get",
  "person-lookup",
  "person-role-lookup",
  "person-profile-picture-get",
  "person-search",
  "company-profile-get",
  "company-lookup",
  "company-id-lookup",
  "company-profile-picture-get",
  "company-employees-list",
  "company-employee-count",
  "company-employee-search",
  "company-search",
  "personal-email-lookup",
  "work-email-lookup",
  "personal-contact-number-lookup",
  "reverse-phone-lookup",
  "reverse-email-lookup",
  "disposable-email-check",
  "job-profile-get",
  "job-search",
  "job-count",
  "school-profile-get",
  "school-students-list",
  "credit-balance-get",
];

Deno.test("index: 25 actions, one auth method and three health checks", () => {
  assertEquals(app.actions.length, 25);
  assertEquals(app.auth.length, 1);
  assertEquals(app.auth[0].key, "api-key");
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: action keys are unique, kebab-case and match the expected surface", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  for (const key of keys) assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), key);
  assertEquals(keys, KEYS);
});

Deno.test("index: every action has a description, output, resource and execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), a.key);
    assert(a.description && Array.isArray(a.output) && a.output.length > 0 && a.resource, a.key);
    assertEquals(typeof a.execute, "function", a.key);
    assertEquals(a.type === "perform", typeof a.idempotent === "boolean", a.key);
  }
});

Deno.test("index: every required param is declared required exactly where the vendor requires it", () => {
  const required = (key: string) =>
    (app.actions.find((a) => a.key === key)!.params ?? []).filter((p) => p.required).map((p) =>
      p.key
    );
  assertEquals(required("person-lookup"), ["firstName", "companyDomain"]);
  assertEquals(required("company-employee-search"), ["companyProfileUrl", "keywordBoolean"]);
  assertEquals(required("company-profile-get"), ["url"]);
  assertEquals(required("person-profile-get"), []);
  assertEquals(required("credit-balance-get"), []);
});

Deno.test("index: no action source touches a credential or global fetch", async () => {
  for (const key of app.actions.map((a) => a.key)) {
    const src = await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url));
    assertEquals(/authorization|\bapiKey\b|bearer/i.test(src), false, key);
    assertEquals(/(^|[^.\w])fetch\(/.test(src), false, key);
  }
});

Deno.test("index: network.allow lists exactly the API host", () => {
  assertEquals(PKG.w6w.network.allow, ["enrichlayer.com"]);
});

Deno.test("index: the quota and service checks are informational", () => {
  assertEquals(app.healthChecks.find((h) => h.key === "quota")?.severity, "informational");
  assertEquals(app.healthChecks.find((h) => h.key === "service")?.severity, "informational");
});
