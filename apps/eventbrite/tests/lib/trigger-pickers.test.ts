/**
 * Every Eventbrite trigger (webhook and poll) offers its organization, event and scope ids as
 * pickers served by the shared `resolveEventbriteFields` hook, the same as the actions do, and
 * still accepts a typed or mapped id. Discovered from the app's own trigger list, so a trigger
 * added later is covered without editing this file.
 */
import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import type { Param } from "@w6w/types";
import app from "../../index.ts";
import { resolveEventbriteFields, withPickers } from "../../lib/fields.ts";

const PICKED = ["organizationId", "eventId", "scopeId"];
const triggers = app.triggers ?? [];

test("the app has triggers to check", () => {
  assert(triggers.length > 20, `expected the Eventbrite triggers, got ${triggers.length}`);
});

test("every trigger's organization, event and scope ids are allow-custom pickers", () => {
  let seen = 0;
  for (const t of triggers) {
    const params = (t.params ?? []) as Param[];
    const keys = new Set(params.map((p) => p.key));
    for (const p of params.filter((x) => PICKED.includes(x.key))) {
      seen++;
      const refreshOn = [
        ...(p.key === "scopeId" && keys.has("scope") ? ["scope"] : []),
        ...(p.key !== "organizationId" && keys.has("organizationId") ? ["organizationId"] : []),
      ];
      assertEquals(
        p.options,
        { source: "resolveFields", ...(refreshOn.length ? { refreshOn } : {}) },
        `${t.key}.${p.key}: options`,
      );
      assertEquals(p.config?.allowCustom, true, `${t.key}.${p.key}: allowCustom`);
    }
  }
  assert(seen >= triggers.length, `expected at least one id param per trigger, saw ${seen}`);
});

test("every trigger with a picker carries the shared resolveFields hook", () => {
  for (const t of triggers) {
    const hasPicker = (t.params ?? []).some((p) => PICKED.includes(p.key));
    if (!hasPicker) continue;
    assert(
      (t as { resolveFields?: unknown }).resolveFields === resolveEventbriteFields,
      `${t.key}: expected resolveFields: resolveEventbriteFields`,
    );
  }
});

test("withPickers leaves non-id params and params with options alone", () => {
  const fixed: Param = {
    key: "eventId",
    label: "Event",
    type: "select",
    options: [{ value: "x", label: "X" }],
  };
  const other: Param = { key: "name", label: "Name", type: "string" };
  const [a, b] = withPickers([fixed, other]);
  assertEquals(a, fixed);
  assertEquals(b, other);
});
