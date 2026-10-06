import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const PKG = JSON.parse(await Deno.readTextFile(new URL("../package.json", import.meta.url)));

const KEYS: string[] = [
  "credits-get",
  "account-list",
  "account-get",
  "log-list",
  "profile-me",
  "profile-get",
  "profile-contact-get",
  "profile-visit",
  "people-search",
  "company-get",
  "company-search",
  "profile-viewers-list",
  "profile-posts-list",
  "profile-reactions-list",
  "profile-comments-list",
  "connection-invite",
  "invitation-accept",
  "invitation-decline",
  "invitation-withdraw",
  "invitation-status-get",
  "connection-list",
  "invitation-list",
  "invitation-sent-list",
  "network-recommendations-list",
  "post-create",
  "post-create-company",
  "post-get",
  "post-search",
  "feed-get",
  "post-react",
  "post-comment",
  "comment-reply",
  "post-repost",
  "post-comments-list",
  "post-reactions-list",
  "message-send",
  "inbox-list",
  "conversation-get",
  "job-list",
  "job-candidates-list",
  "candidate-cv-get",
  "job-create",
  "job-publish",
  "job-close",
  "email-find",
  "email-validate",
  "email-reverse",
  "webhook-list",
  "webhook-create",
  "webhook-update",
  "webhook-delete",
  "webhook-start",
  "webhook-stop",
  "webhook-events-list",
];

Deno.test("index: one api-key auth method and three health checks", () => {
  assertEquals(app.auth?.length, 1);
  assertEquals(app.auth?.[0].key, "api-key");
  assertEquals(app.healthChecks?.map((h) => h.key), ["service", "api", "quota"]);
});

Deno.test("index: action keys are unique and match the expected surface", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length);
  assertEquals(keys.slice().sort(), KEYS.slice().sort());
});

Deno.test("index: every action has a title, a valid type and an execute hook", () => {
  for (const action of app.actions) {
    assertEquals(typeof action.title, "string");
    assertEquals(["read", "search", "perform"].includes(action.type), true);
    assertEquals(typeof action.execute, "function");
    assertEquals(action.type === "perform", typeof action.idempotent === "boolean");
  }
});

Deno.test("index: account-scoped actions require accountId; enrichment actions do not", () => {
  const enrich = new Set(["email-find", "email-validate", "email-reverse"]);
  const accountless = new Set([
    "credits-get",
    "account-list",
    "log-list",
    ...enrich,
    "webhook-list",
    "webhook-update",
    "webhook-delete",
    "webhook-start",
    "webhook-stop",
    "webhook-events-list",
  ]);
  for (const action of app.actions) {
    const acc = (action.params ?? []).find((p) => p.key === "accountId");
    if (accountless.has(action.key)) continue;
    assert(acc?.required, `${action.key} must require accountId`);
  }
  for (const key of enrich) {
    const a = app.actions.find((x) => x.key === key)!;
    assertEquals((a.params ?? []).some((p) => p.key === "accountId"), false, key);
  }
});

Deno.test("index: no action source touches a credential or global fetch", async () => {
  for (const key of KEYS) {
    const src = (await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url)))
      .replace(/\/\*[\s\S]*?\*\//g, "");
    assertEquals(/authorization|bearer|x-api-key|apiKey/i.test(src), false, key);
    assertEquals(/(^|[^.\w])fetch\(/.test(src), false, key);
  }
});

Deno.test("index: network.allow lists exactly the hosts the app calls", () => {
  assertEquals([...PKG.w6w.network.allow].sort(), ["api.linkupapi.com"]);
});

Deno.test("index: the quota check is a live informational probe, the service check a declared absence", () => {
  const quota = app.healthChecks!.find((h) => h.key === "quota")!;
  assertEquals(quota.severity, "informational");
  assertEquals(typeof quota.check, "function");
  assert(!quota.unavailable);
  const service = app.healthChecks!.find((h) => h.key === "service")!;
  assertEquals(service.severity, "informational");
  assert(service.unavailable?.reason);
});
