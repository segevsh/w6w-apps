import { sinceTrigger, toMs } from "../lib/since.ts";
import incidentList from "../actions/incident-list.ts";

/** The vendor maximum for incidents (see the incident-list action). */
export const PAGE_SIZE = 50;

interface Incident {
  id?: string;
  started_at?: string;
}

/** `from` takes a date (YYYY-MM-DD), not a time, so the window is the UTC day of the look-back. */
export function fromDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export default sinceTrigger<Incident>({
  key: "new-incident",
  title: "New Incident",
  description: "The run gets each newly started incident.",
  async fetchPage(sinceMs, page, ctx) {
    const res = await incidentList.execute(
      { from: fromDate(sinceMs), page, per_page: PAGE_SIZE },
      ctx,
    ) as { items?: Incident[]; hasMore?: boolean };
    return { items: res.items ?? [], more: res.hasMore === true };
  },
  pageSize: PAGE_SIZE,
  idOf: (i) => String(i.id),
  tsOf: (i) => toMs(i.started_at),
  output: [
    { key: "id", type: "string", label: "Incident ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "started_at", type: "string", label: "Started at" },
    { key: "status", type: "string", label: "Status" },
    { key: "cause", type: "string", label: "Cause" },
  ],
  sample: {
    id: "123456",
    name: "Website homepage",
    started_at: "2026-11-09T09:00:00.000Z",
    status: "Started",
    cause: "Status 500",
  },
});
