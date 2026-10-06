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
    appearance: { icon: { url: string } };
  };
};

Deno.test("index: exports 28 actions with unique kebab-case keys and valid types", () => {
  assertEquals(app.actions.length, 28);
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

/** Anything that duplicates on a retry says so; deletes, updates and commands do not. */
Deno.test("index: the actions that duplicate on a retry are honest about it", () => {
  const notIdempotent = app.actions.filter((a) => a.idempotent === false).map((a) => a.key).sort();
  assertEquals(notIdempotent, [
    "contact-create",
    "group-create",
    "message-send",
    "status-post",
    "waba-message-send",
    "webhook-subscribe",
  ]);
});

Deno.test("index: no action key is a vendor path accident (all keys are the shipped list)", () => {
  assertEquals(app.actions.map((a) => a.key), [
    "users-list",
    "contact-create",
    "contacts-list",
    "contact-get",
    "contact-update",
    "contact-delete",
    "contacts-search",
    "webhook-subscribe",
    "webhooks-list",
    "webhook-delete",
    "numbers-list",
    "channel-status-get",
    "channel-command",
    "message-send",
    "messages-list",
    "conversations-list",
    "message-get",
    "message-delete",
    "group-messages-list",
    "number-check",
    "status-post",
    "groups-list",
    "group-get",
    "group-create",
    "group-participants-update",
    "waba-message-send",
    "waba-templates-list",
    "waba-conversation-window-get",
  ]);
});

Deno.test("index: one api-key auth method and the two declared health checks", () => {
  assertEquals(app.auth.map((a) => a.key), ["api-key"]);
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
});

Deno.test("index: manifest id, single API host and icon are what the README claims", () => {
  assertEquals(manifest.w6w.id, "io.w6w.2chat");
  assertEquals(manifest.w6w.displayName, "2Chat");
  assertEquals(manifest.w6w.network.allow, ["api.p.2chat.io"]);
  assert(manifest.w6w.categories.length >= 1 && manifest.w6w.categories.length <= 3);
  assertEquals(manifest.w6w.appearance.icon.url, "./assets/icon.png");
});

Deno.test("index: no action sets an Authorization or API-key header itself", async () => {
  for (
    const key of [
      "users-list",
      "contact-create",
      "contacts-list",
      "contact-get",
      "contact-update",
      "contact-delete",
      "contacts-search",
      "webhook-subscribe",
      "webhooks-list",
      "webhook-delete",
      "numbers-list",
      "channel-status-get",
      "channel-command",
      "message-send",
      "messages-list",
      "conversations-list",
      "message-get",
      "message-delete",
      "group-messages-list",
      "number-check",
      "status-post",
      "groups-list",
      "group-get",
      "group-create",
      "group-participants-update",
      "waba-message-send",
      "waba-templates-list",
      "waba-conversation-window-get",
    ]
  ) {
    const src = await Deno.readTextFile(new URL(`../actions/${key}.ts`, import.meta.url));
    assert(!/authorization|x-user-api-key/i.test(src), `${key} touches credentials`);
    assert(!/[^.\w]fetch\(/.test(src), `${key} calls global fetch`);
  }
});
