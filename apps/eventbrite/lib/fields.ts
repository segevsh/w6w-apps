import type { HookContext, Option, ResolveFieldsHook } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "./client.ts";

const MAX_OPTIONS = 1000;

interface Named {
  id: string;
  name?: string;
}

/** Page a list endpoint (continuation token if given, else page number) up to the cap. */
async function listAll<K extends string>(
  ctx: HookContext,
  path: string,
  key: K,
): Promise<Named[]> {
  const client = new EventbriteClient(ctx);
  const items: Named[] = [];
  let query: Record<string, string | number> = {};
  while (items.length < MAX_OPTIONS) {
    const res = await client.request<EventbriteListResponse<K, Named>>(path, { query });
    items.push(...(res[key] ?? []));
    const p = res.pagination;
    if (!p?.has_more_items) break;
    query = p.continuation ? { continuation: p.continuation } : { page: (p.page_number ?? 1) + 1 };
  }
  return items.slice(0, MAX_OPTIONS);
}

const listOrgs = (ctx: HookContext) => listAll(ctx, "/users/me/organizations/", "organizations");
const listOrganizers = (ctx: HookContext, orgId: string) =>
  listAll(ctx, `/organizations/${encodeURIComponent(orgId)}/organizers/`, "organizers");

/** Shared `resolveFields` hook for the Eventbrite organizer-bearing actions. */
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

  if (input.fields.includes("scopeId") && !input.unresolved.includes("scope")) {
    fields.scopeId = {
      options: input.form.scope === "organization" ? await orgOptions() : [],
    };
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
