import type { ActionDefinition, HookContext, OutputField, TriggerDefinition } from "@w6w/types";
import { pollFromListAction, pollSnapshot } from "../../_shared/poll/mod.ts";
import searchCompanies from "../actions/search-companies.ts";
import searchContacts from "../actions/search-contacts.ts";
import searchDeals from "../actions/search-deals.ts";
import searchTickets from "../actions/search-tickets.ts";
import listForms from "../actions/list-forms.ts";
import listOwners from "../actions/list-owners.ts";

/**
 * HubSpot poll triggers over the app's own search and list actions (same client, same endpoint).
 *
 * CRM search takes one sort rule per request
 * (https://developers.hubspot.com/docs/api-reference/legacy/crm/search-the-crm, verified
 * 2026-11-10): `{ propertyName, direction: "DESCENDING" }`. `createdate` orders by creation on
 * every object; the last-modified stamp is `lastmodifieddate` on contacts and
 * `hs_lastmodifieddate` on companies, deals and tickets (the property tables on the same page).
 * A search hit carries `id`, `properties`, `createdAt`, `updatedAt`.
 */
export interface RecordKind {
  noun: string;
  title: string;
  action: ActionDefinition;
  modifiedProperty: string;
  sample: Record<string, unknown>;
}

const asAction = (a: unknown) => a as ActionDefinition;

export const RECORD_KINDS: Record<"contact" | "company" | "deal" | "ticket", RecordKind> = {
  contact: {
    noun: "contact",
    title: "Contact",
    action: asAction(searchContacts),
    modifiedProperty: "lastmodifieddate",
    sample: {
      id: "123",
      properties: { email: "ada@example.com", createdate: "2026-11-09T12:00:00Z" },
      createdAt: "2026-11-09T12:00:00Z",
      updatedAt: "2026-11-10T08:30:00Z",
    },
  },
  company: {
    noun: "company",
    title: "Company",
    action: asAction(searchCompanies),
    modifiedProperty: "hs_lastmodifieddate",
    sample: {
      id: "456",
      properties: { name: "Acme", domain: "acme.example", createdate: "2026-11-09T12:00:00Z" },
      createdAt: "2026-11-09T12:00:00Z",
      updatedAt: "2026-11-10T08:30:00Z",
    },
  },
  deal: {
    noun: "deal",
    title: "Deal",
    action: asAction(searchDeals),
    modifiedProperty: "hs_lastmodifieddate",
    sample: {
      id: "789",
      properties: { dealname: "Renewal", dealstage: "appointmentscheduled", amount: "1500" },
      createdAt: "2026-11-09T12:00:00Z",
      updatedAt: "2026-11-10T08:30:00Z",
    },
  },
  ticket: {
    noun: "ticket",
    title: "Ticket",
    action: asAction(searchTickets),
    modifiedProperty: "hs_lastmodifieddate",
    sample: {
      id: "321",
      properties: { subject: "Cannot log in", hs_pipeline_stage: "1" },
      createdAt: "2026-11-09T12:00:00Z",
      updatedAt: "2026-11-10T08:30:00Z",
    },
  },
};

const RECORD_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Record ID" },
  { key: "properties", type: "object", label: "Properties" },
  { key: "createdAt", type: "string", label: "Created At" },
  { key: "updatedAt", type: "string", label: "Updated At" },
];

const results = (result: unknown): unknown[] => {
  const r = (result as { results?: unknown } | null)?.results;
  return Array.isArray(r) ? r : [];
};

const idString = (item: unknown): string => String((item as { id?: unknown }).id ?? "");

const QUERY_PARAM = {
  key: "query",
  label: "Search query",
  type: "string" as const,
  hint: "Optional text search; only matching records are watched.",
};

/** `new-<record>`: search by creation date, newest first. */
export function newRecordTrigger(
  { key, kind }: { key: string; kind: RecordKind },
): TriggerDefinition {
  return pollFromListAction<{ query?: string }>({
    key,
    title: `New ${kind.title}`,
    description:
      `Polls HubSpot ${kind.noun} search in creation-date order and emits each ${kind.noun} created since the last check. The run gets the ${kind.noun}.`,
    action: kind.action,
    input: (params) => ({
      query: params.query,
      sorts: [{ propertyName: "createdate", direction: "DESCENDING" }],
      limit: 100,
    }),
    items: results,
    idOf: idString,
    params: [QUERY_PARAM],
    output: RECORD_OUTPUT,
    sample: kind.sample,
  });
}

/** `new-or-updated-<record>`: search by last-modified date, newest first; an edit is a new event. */
export function newOrUpdatedRecordTrigger(
  { key, kind }: { key: string; kind: RecordKind },
): TriggerDefinition {
  return pollFromListAction<{ query?: string }>({
    key,
    title: `New or Updated ${kind.title}`,
    description:
      `Polls HubSpot ${kind.noun} search by last-modified date and emits each ${kind.noun} that is created or edited since the last check. The run gets the ${kind.noun} as it is now.`,
    action: kind.action,
    input: (params) => ({
      query: params.query,
      sorts: [{ propertyName: kind.modifiedProperty, direction: "DESCENDING" }],
      limit: 100,
    }),
    items: results,
    idOf: (item) => {
      const updated = (item as { updatedAt?: unknown }).updatedAt;
      return `${idString(item)}:${typeof updated === "string" ? updated : ""}`;
    },
    params: [QUERY_PARAM],
    output: RECORD_OUTPUT,
    sample: kind.sample,
  });
}

/** Pages through a cursor-paged list action, capped so a runaway account fails loudly. */
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

async function collectAll(
  action: ActionDefinition,
  ctx: HookContext,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  let after: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const result = await action.execute({ limit: PAGE_SIZE, after }, ctx) as {
      results?: unknown[];
      paging?: { next?: { after?: string } };
    };
    rows.push(...results(result));
    after = result.paging?.next?.after;
    if (!after) return rows;
  }
  throw new Error(
    `HubSpot returned more than ${
      MAX_PAGES * PAGE_SIZE
    } ${action.key} rows; this trigger only watches collections up to that size.`,
  );
}

/** `new-<thing>`: a small account-configuration collection watched as a snapshot. */
export function newSnapshotTrigger(spec: {
  key: string;
  title: string;
  description: string;
  action: ActionDefinition;
  sample: unknown;
}): TriggerDefinition {
  return {
    key: spec.key,
    title: spec.title,
    description: spec.description,
    output: [
      { key: "change", type: "string", label: "Change" },
      { key: "key", type: "string", label: "ID" },
      { key: "values", type: "object", label: "Record" },
    ],
    sample: spec.sample,
    minIntervalMs: 300_000,
    async poll({ state }, ctx) {
      const rows = (await collectAll(spec.action, ctx)).map((item) => ({
        key: idString(item),
        values: item,
      }));
      return await pollSnapshot({ state, rows, emit: { added: true } });
    },
  };
}

export const FORMS_ACTION = asAction(listForms);
export const OWNERS_ACTION = asAction(listOwners);
