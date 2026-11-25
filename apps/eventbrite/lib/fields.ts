import type { HookContext, Option, Param, ResolveFieldsHook } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "./client.ts";

const MAX_OPTIONS = 1000;

interface Named {
  id: string;
  name?: string;
}

/** An event row: Eventbrite gives an event's name as `{ text, html }`, not a string. */
interface EventRow {
  id: string;
  name?: { text?: string | null } | null;
  start?: { local?: string | null } | null;
  status?: string;
}

/**
 * Event statuses the picker lists: everything a workflow could still be watching or reading.
 * Completed and canceled events are left out; an id can still be typed or mapped.
 */
const PICKER_EVENT_STATUS = "draft,live,started,ended";

/** Page a list endpoint using its supported pagination style, up to the cap. */
async function listAll<K extends string, T = Named>(
  ctx: HookContext,
  path: string,
  key: K,
  pagination: "continuation" | "page" = "continuation",
  base: Record<string, string> = {},
): Promise<T[]> {
  const client = new EventbriteClient(ctx);
  const items: T[] = [];
  const seenPages = new Set<string>();
  let query: Record<string, string | number> = { ...base };
  while (items.length < MAX_OPTIONS) {
    const pageKey = JSON.stringify(query);
    if (seenPages.has(pageKey) || seenPages.size >= MAX_OPTIONS) {
      throw new Error("Eventbrite pagination did not advance while loading field options.");
    }
    seenPages.add(pageKey);
    const res = await client.request<EventbriteListResponse<K, T>>(path, { query });
    items.push(...(res[key] ?? []));
    const p = res.pagination;
    if (!p?.has_more_items) break;
    // Organizers returns a continuation token too, but ignores that query parameter:
    // following it repeats page 1. That endpoint must advance with `page`.
    query = pagination === "continuation" && p.continuation
      ? { ...base, continuation: p.continuation }
      : { ...base, page: (p.page_number ?? Number(query.page ?? 1)) + 1 };
  }
  return items.slice(0, MAX_OPTIONS);
}

const listOrgs = (ctx: HookContext) => listAll(ctx, "/users/me/organizations/", "organizations");
const listOrganizers = (ctx: HookContext, orgId: string) =>
  listAll(ctx, `/organizations/${encodeURIComponent(orgId)}/organizers/`, "organizers", "page");

const listEvents = (ctx: HookContext, orgId: string) =>
  listAll<"events", EventRow>(
    ctx,
    `/organizations/${encodeURIComponent(orgId)}/events/`,
    "events",
    "continuation",
    { status: PICKER_EVENT_STATUS, order_by: "start_desc" },
  );

/** "Name · 2026-12-01" — the start date tells apart a series' same-named dates. */
function eventOption(e: EventRow, orgName?: string): Option {
  const name = e.name?.text?.trim() || e.id;
  const day = e.start?.local?.slice(0, 10);
  const label = day ? `${name} · ${day}` : name;
  const parts = [orgName, e.status].filter((x): x is string => !!x);
  return parts.length > 0 ? { value: e.id, label, description: parts.join(" · ") } : {
    value: e.id,
    label,
  };
}

/**
 * Shared `resolveFields` hook for the Eventbrite actions and triggers that take an organization,
 * organizer or event: one picker per id, each still accepting a typed or mapped value.
 */
export const resolveEventbriteFields: ResolveFieldsHook = async (input, ctx) => {
  const fields: Record<string, { options: Option[] }> = {};

  // One `/users/me/organizations/` fetch serves both `organizationId` and an organization `scopeId`.
  let orgs: Promise<Named[]> | undefined;
  const orgsOnce = () => (orgs ??= listOrgs(ctx));
  const orgOptions = async () =>
    (await orgsOnce()).map((o) => ({ value: o.id, label: o.name ?? o.id }));

  if (input.fields.includes("organizationId")) {
    fields.organizationId = { options: await orgOptions() };
  }

  // Events of the form's organization; with no organization chosen (or no organization field at
  // all), the events of every organization the account belongs to, each labelled with its org.
  const eventOptions = async (orgId: unknown): Promise<Option[]> => {
    if (typeof orgId === "string" && orgId !== "") {
      return (await listEvents(ctx, orgId)).map((e) => eventOption(e));
    }
    const options: Option[] = [];
    for (const org of await orgsOnce()) {
      if (options.length >= MAX_OPTIONS) break;
      for (const e of await listEvents(ctx, org.id)) {
        options.push(eventOption(e, org.name ?? org.id));
      }
    }
    return options.slice(0, MAX_OPTIONS);
  };

  if (input.fields.includes("scopeId") && !input.unresolved.includes("scope")) {
    fields.scopeId = {
      options: input.form.scope === "organization"
        ? await orgOptions()
        : input.form.scope === "event"
        ? await eventOptions(input.form.organizationId)
        : [],
    };
  }

  if (input.fields.includes("eventId") && !input.unresolved.includes("organizationId")) {
    fields.eventId = { options: await eventOptions(input.form.organizationId) };
  }

  if (input.fields.includes("organizerId") && !input.unresolved.includes("organizationId")) {
    const orgId = input.form.organizationId;
    let options: Option[];
    if (typeof orgId === "string" && orgId !== "") {
      const organizers = await listOrganizers(ctx, orgId);
      options = organizers.map((o) => ({ value: o.id, label: o.name ?? o.id }));
    } else {
      options = [];
      for (const org of await orgsOnce()) {
        if (options.length >= MAX_OPTIONS) break;
        for (const o of await listOrganizers(ctx, org.id)) {
          options.push({
            value: o.id,
            label: o.name ?? o.id,
            description: org.name ?? org.id,
          });
        }
      }
      options = options.slice(0, MAX_OPTIONS);
    }
    fields.organizerId = { options };
  }

  return { fields };
};

/** The id params `resolveEventbriteFields` serves options for. */
const PICKED_KEYS = new Set(["organizationId", "eventId", "scopeId"]);

/**
 * A trigger's params with every organization, event and scope id turned into a picker served by
 * `resolveEventbriteFields`, the same as on the actions. Each still accepts a typed or mapped id
 * (`allowCustom`), and an event picker refreshes when its organization changes. A param that
 * already declares options is left as it is.
 */
export function withPickers(params: Param[]): Param[] {
  const keys = new Set(params.map((p) => p.key));
  return params.map((p) => {
    if (!PICKED_KEYS.has(p.key) || p.type !== "string" || p.options) return p;
    const refreshOn = [
      ...(p.key === "scopeId" && keys.has("scope") ? ["scope"] : []),
      ...(p.key !== "organizationId" && keys.has("organizationId") ? ["organizationId"] : []),
    ];
    return {
      ...p,
      options: { source: "resolveFields", ...(refreshOn.length > 0 ? { refreshOn } : {}) },
      config: { ...p.config, allowCustom: true },
    };
  });
}
