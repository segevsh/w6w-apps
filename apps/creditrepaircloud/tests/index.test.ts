import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

const ACTION_KEYS = [
  "insert-lead",
  "update-lead",
  "delete-lead",
  "view-lead",
  "insert-affiliate",
  "update-affiliate",
  "delete-affiliate",
  "view-affiliate",
];

Deno.test("index: exports exactly the eight documented actions", () => {
  assert(Array.isArray(app.actions));
  assertEquals(app.actions.map((a) => a.key).sort(), [...ACTION_KEYS].sort());
  assertEquals(app.auth.length, 1);
  assertEquals(app.healthChecks.length, 1);
});

Deno.test("index: every action key is unique and kebab-case", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(new Set(keys).size, keys.length, "duplicate action key");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `not kebab-case: ${key}`);
  }
});

Deno.test("index: every action declares a type, a description and an execute hook", () => {
  for (const a of app.actions) {
    assert(["read", "search", "perform"].includes(a.type), `${a.key}: bad type ${a.type}`);
    assert(
      typeof a.description === "string" && a.description.length > 0,
      `${a.key}: no description`,
    );
    assertEquals(typeof a.execute, "function", `${a.key}: no execute`);
    assert(Array.isArray(a.output), `${a.key}: no output`);
    assertEquals((a.output as unknown[]).length, 5, `${a.key}: envelope output`);
  }
});

Deno.test("index: the four view/delete actions are the read ones", () => {
  for (const a of app.actions) {
    const read = a.key.startsWith("view-");
    assertEquals(a.type, read ? "read" : "perform", `${a.key}: wrong type`);
  }
});

Deno.test("index: every perform action states idempotency explicitly", () => {
  for (const a of app.actions) {
    if (a.type !== "perform") continue;
    assertEquals(typeof a.idempotent, "boolean", `${a.key}: idempotent not declared`);
  }
});

/**
 * The vendor accepts no idempotency key on insert, so a retry is a second
 * record. Updates are retryable (same values, same record) and deletes cannot
 * compound (the pack's convention), both recorded in each action's doc comment.
 */
Deno.test("index: inserts are not idempotent, updates and deletes are", () => {
  const byKey = new Map(app.actions.map((a) => [a.key, a]));
  for (const key of ["insert-lead", "insert-affiliate"]) {
    assertEquals(byKey.get(key)?.idempotent, false, key);
  }
  for (const key of ["update-lead", "update-affiliate", "delete-lead", "delete-affiliate"]) {
    assertEquals(byKey.get(key)?.idempotent, true, key);
  }
});

Deno.test("index: no action declares a credential-shaped param", () => {
  // Credentials live on the Auth method; an Action that accepted one would put
  // a secret in every workflow's saved input.
  for (const a of app.actions) {
    for (const p of a.params ?? []) {
      assert(
        !/^(apiauthkey|secretkey|api_?key|secret_?key)$/i.test(p.key),
        `${a.key}: declares credential param ${p.key}`,
      );
      assertEquals(p.secret, undefined, `${a.key}: ${p.key} marked secret`);
    }
  }
});

Deno.test("index: every required field each method documents is present", () => {
  const required = (key: string) =>
    (app.actions.find((a) => a.key === key)?.params ?? [])
      .filter((p) => p.required === true)
      .map((p) => p.key)
      .sort();
  assertEquals(required("insert-lead"), ["firstname", "lastname", "type"]);
  assertEquals(
    required("update-lead"),
    ["firstname", "id", "lastname", "type"],
  );
  assertEquals(required("delete-lead"), ["id"]);
  assertEquals(required("view-lead"), ["id"]);
  assertEquals(
    required("insert-affiliate"),
    ["email", "firstname", "lastname", "phone", "type"],
  );
  assertEquals(
    required("update-affiliate"),
    ["firstname", "id", "lastname", "type"],
  );
  assertEquals(required("delete-affiliate"), ["id"]);
  assertEquals(required("view-affiliate"), ["id"]);
});

Deno.test("index: the affiliate zip/post_code split is preserved per method", () => {
  const keys = (key: string) =>
    (app.actions.find((a) => a.key === key)?.params ?? []).map((p) => p.key);
  assert(keys("insert-affiliate").includes("zip"), "insert-affiliate should send `zip`");
  assert(!keys("insert-affiliate").includes("post_code"));
  assert(
    keys("update-affiliate").includes("post_code"),
    "update-affiliate should send `post_code`",
  );
  assert(!keys("update-affiliate").includes("zip"));
});

Deno.test("index: the undocumented-table fields are not declared", () => {
  // `phone_work_ext` and `fax` appear in the vendor's example XML but not in the
  // same page's Request Parameters table; `fax` also on the affiliate insert.
  const keys = new Set(app.actions.flatMap((a) => (a.params ?? []).map((p) => p.key)));
  assert(!keys.has("phone_work_ext"), "phone_work_ext is not in the vendor's table");
  assert(!keys.has("fax"), "fax is not in the vendor's table");
});

Deno.test("index: the insert-only portal fields are absent from the update actions", () => {
  const insertOnly = [
    "client_portal_access",
    "client_userid",
    "client_agreement",
    "send_setup_password_info_via_email",
    "affiliate_portal_access",
    "affiliate_userid",
  ];
  const updateKeys = new Set(
    app.actions
      .filter((a) => a.key.startsWith("update-"))
      .flatMap((a) => (a.params ?? []).map((p) => p.key)),
  );
  for (const key of insertOnly) {
    assert(!updateKeys.has(key), `${key} should not appear on an update action`);
  }
});

Deno.test("index: the icon is the vendor's own 16x16 PNG, embedded verbatim", () => {
  // 522 bytes, decoded from the payload the contract pins. If `deno fmt` ever
  // rewrites assets/icon.svg (bare `deno fmt` does), this fails.
  const payload =
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAABGdBTUEAALGPC/xhBQAAAOpQTFRFAAAA/1WA" +
    "8ztr7zdn7zdn7zdn7jdn7jhn6jdo7zdnXFOeX2KnZU2WZWGmaEmSaGiqanGxdmSkdm+tdn+5d0iPeEmOeEmP" +
    "ekeMenOvenq0e1iZe3l6fX+4f1SWf4S8jEeIkEuLklSSlZOTmZeXnqrSn57JoaCgoqGhpEJ+pUJ/rDh1rEWA" +
    "sD54srCxsrjYusHewcjiwzdvxM7mxsXFy8rK3t3d4ODg4Tdo5ubm5+fn6Ddn6jdn6u/36zdm7jdm7/P58O/w" +
    "8fT69Pf79qfK9vj8+cPb+cTc/f7//v////n8//v9//z9//3+////YOjUwgAAAAp0Uk5TAAYrj5S91fP9/XBO" +
    "iHoAAAC1SURBVBjTbc/pNgNBAEThmu5OtxYiaCO2ILHvEhl7WUYSIvX+r+MHx3HwPcG9AABjfQjeGnzKXCRJ" +
    "MroMALIKv1UyAI68ueXh7FJj+ZIOMJGbzfnJLUl30/fRwPLoVHqQJHX2aeFZe1a7Ja0c62mKHmHjZDy4vpJ6" +
    "j32drQWEGb2V40IqRuW76gF+TpIudna7klT1sOvbw9cvL6t7FiYeLOR5nlJKafF8wgCOP7j/0v/M/dr/AJlf" +
    "JN96dFV7AAAAAElFTkSuQmCC";
  const svg = Deno.readTextFileSync(new URL("../assets/icon.svg", import.meta.url));
  assert(svg.includes(`base64,${payload}"`), "icon no longer embeds the vendor payload verbatim");
  const bytes = Uint8Array.from(
    atob(payload),
    (c) => c.charCodeAt(0),
  );
  assertEquals(bytes.length, 522, "the vendor's mark is a 522-byte 16x16 PNG");
  assertEquals([...bytes.slice(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], "not a PNG");
});
