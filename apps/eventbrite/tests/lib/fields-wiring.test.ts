/**
 * Wiring test for the `organizationId` picker.
 *
 * Every Eventbrite action that takes an `organizationId` (and the two that pick
 * an organizer/venue by hand, `get-organizer` and `update-venue`) must resolve
 * its choices through the shared `resolveEventbriteFields` hook: the param
 * carries `options: { source: "resolveFields" }` and `config: { allowCustom: true }`,
 * and the action carries `resolveFields: resolveEventbriteFields`.
 *
 * The action set is discovered from disk, so an action added later with an
 * `organizationId` param fails here until it is wired too.
 */
import { denoReadDir } from "../_deno.ts";
import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import type { ActionDefinition, Param } from "@w6w/types";
import { resolveEventbriteFields } from "../../lib/fields.ts";

const ACTION_DIR = new URL("../../actions/", import.meta.url);

/** Actions wired to the shared hook (T1.6 + T1.6b). */
const WIRED = [
  // T1.6
  "create-event",
  "create-venue",
  "update-venue",
  "get-organizer",
  // T1.6b
  "add-ticket-class-to-ticket-groups",
  "create-discount",
  "create-webhook",
  "create-ticket-group",
  "create-text-overrides",
  "get-text-overrides",
  "list-organization-roles",
  "list-organization-members",
  "list-seat-maps",
  "search-discounts",
  "list-webhooks",
  "list-organizers",
  "list-events",
  "list-ticket-groups",
  "list-venues",
];

async function loadActions(): Promise<Map<string, ActionDefinition>> {
  const byKey = new Map<string, ActionDefinition>();
  for await (const entry of denoReadDir(ACTION_DIR)) {
    if (!entry.isFile || !entry.name.endsWith(".ts")) continue;
    const mod = await import(new URL(entry.name, ACTION_DIR).href);
    const action = mod.default as ActionDefinition | undefined;
    assert(action, `actions/${entry.name}: missing default export`);
    byKey.set(action.key, action);
  }
  return byKey;
}

const actions = await loadActions();
const orgParam = (action: ActionDefinition): Param | undefined =>
  (action.params ?? []).find((p) => p.key === "organizationId");

test("every wired action resolves its pickers through the shared hook", () => {
  for (const key of WIRED) {
    const action = actions.get(key);
    assert(action, `actions/ is missing the ${key} action`);
    assert(
      action.resolveFields === resolveEventbriteFields,
      `${key}: expected resolveFields: resolveEventbriteFields`,
    );
  }
});

test("organizationId params render as an allow-custom resolved picker", () => {
  for (const key of WIRED) {
    const action = actions.get(key);
    assert(action, `actions/ is missing the ${key} action`);
    const param = orgParam(action);
    if (!param) continue; // get-organizer / update-venue pick another resource
    assertEquals(param.options, { source: "resolveFields" }, `${key}: organizationId options`);
    assertEquals(param.config?.allowCustom, true, `${key}: organizationId config.allowCustom`);
  }
});

test("every action declaring an organizationId param is wired", () => {
  const unwired = [...actions.values()]
    .filter((action) => orgParam(action) !== undefined)
    .map((action) => action.key)
    .filter((key) => !WIRED.includes(key));
  assertEquals(unwired, [], "actions with an organizationId param missing the picker wiring");
});

const SCOPED = ["list-events", "list-attendees", "list-orders"];
const scopeWhen: Record<string, Array<[string, Record<string, unknown>]>> = {
  "list-events": [
    ["organization", { label: "Organization ID" }],
    ["venue", { label: "Venue ID", required: true }],
    ["series", { label: "Event series ID", required: true }],
  ],
  "list-attendees": [
    ["event", { label: "Event ID" }],
    ["organization", { label: "Organization ID" }],
  ],
  "list-orders": [
    ["event", { label: "Event ID" }],
    ["organization", { label: "Organization ID" }],
    ["user", { label: "User ID" }],
  ],
};

test("scopeId is one cascading, resolved picker on the three list actions", () => {
  for (const key of SCOPED) {
    const action = actions.get(key);
    assert(action, `actions/ is missing ${key}`);
    assert(action.resolveFields === resolveEventbriteFields, `${key}: resolveFields`);
    const p = (action.params ?? []).find((x) => x.key === "scopeId");
    assert(p, `${key}: scopeId`);
    assertEquals(p.options, { source: "resolveFields", refreshOn: ["scope"] }, `${key}: options`);
    assertEquals(p.config, { allowCustom: true }, `${key}: config`);
    assertEquals(p.required === true, key !== "list-events", `${key}: base required`);
    assertEquals(
      p.when,
      scopeWhen[key].map(([v, set]) => ({ if: { field: "scope", equals: v }, set })),
      `${key}: when`,
    );
  }
});

test("list-events keeps organizationId declared as a hidden legacy alias", () => {
  const p = orgParam(actions.get("list-events")!);
  assert(p, "organizationId must stay declared so the runtime hands it to execute");
  assertEquals(p.label, "Organization ID (legacy)");
  assertEquals(p.showIf, { field: "organizationId", truthy: true });
  assert(!p.required);
});
