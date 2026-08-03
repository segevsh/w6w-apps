import { assert, assertEquals } from "@std/assert";
import { mockCtx, optionValues, param } from "../_helpers.ts";
import createEvent from "../../actions/create-event.ts";
import { ACTION_PLAN_EVENT_TYPES, EVENT_TYPES } from "../../lib/client.ts";

Deno.test("create-event: POSTs /events with the documented body", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 132, personId: 12264 } }]);
  await createEvent.execute({
    type: "Property Inquiry",
    source: "Zillow",
    system: "Zillow",
    message: "I am interested in 6825 Mulholland Dr",
    person: {
      firstName: "Melissa",
      lastName: "Hartman",
      emails: [{ value: "m.hartman@example.com", type: "home" }],
    },
    property: { street: "6825 Mulholland Dr", city: "Los Angeles", state: "CA", code: "90068" },
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.followupboss.com/v1/events");
  assertEquals(JSON.parse(calls[0].body!), {
    type: "Property Inquiry",
    source: "Zillow",
    system: "Zillow",
    message: "I am interested in 6825 Mulholland Dr",
    person: {
      firstName: "Melissa",
      lastName: "Hartman",
      emails: [{ value: "m.hartman@example.com", type: "home" }],
    },
    property: { street: "6825 Mulholland Dr", city: "Los Angeles", state: "CA", code: "90068" },
  });
});

Deno.test("create-event: sends only what was supplied", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await createEvent.execute({ type: "Registration" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { type: "Registration" });
});

/**
 * A 204 here means "the lead flow for this source is archived and the lead was
 * ignored" — a documented, non-error outcome. It must not throw.
 */

/**
 * A 204 here means "the lead flow for this source is archived and the lead was
 * ignored" — a documented, non-error outcome. It must not throw.
 */
Deno.test("create-event: a 204 resolves rather than throwing", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await createEvent.execute({ type: "Registration" }, ctx), undefined);
});

Deno.test("create-event: offers exactly the fourteen documented event types", () => {
  const values = optionValues(createEvent, "type");
  assertEquals(values.length, 14);
  assertEquals(values, [...EVENT_TYPES]);
  assertEquals(param(createEvent, "type").required, true);
});

/**
 * Choosing a type outside the action-plan set silently means "record this, but
 * run nothing" — the call still succeeds. The option labels are how a workflow
 * author sees that before they hit it.
 */

/**
 * Choosing a type outside the action-plan set silently means "record this, but
 * run nothing" — the call still succeeds. The option labels are how a workflow
 * author sees that before they hit it.
 */
Deno.test("create-event: labels which types actually trigger action plans", () => {
  const options = param(createEvent, "type").options as Array<{ value: string; label: string }>;
  for (const o of options) {
    const triggers = (ACTION_PLAN_EVENT_TYPES as readonly string[]).includes(o.value);
    assertEquals(
      o.label.includes("triggers action plans"),
      triggers,
      `${o.value}: label disagrees with the documented action-plan set`,
    );
  }
  assertEquals(ACTION_PLAN_EVENT_TYPES.length, 5);
});

Deno.test("create-event: is the described lead pipe and is not idempotent", () => {
  assertEquals(createEvent.type, "perform");
  assertEquals(createEvent.idempotent, false);
  assert(/de-duplicates/i.test(createEvent.description!), createEvent.description);
  assert(param(createEvent, "occurredAt").hint?.includes("historical"));
});
