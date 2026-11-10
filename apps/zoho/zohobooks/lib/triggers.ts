import { pollFromListAction } from "../../_shared/poll/mod.ts";
import contactList from "../actions/contact-list.ts";
import { organizationId } from "./params.ts";

/**
 * Contact feed over `contact-list`. Zoho Books documents `sort_column` on List Contacts
 * ("Allowed Values: contact_name, first_name, last_name, email, outstanding_receivable_amount,
 * created_time and last_modified_time") but documents no request value for the direction; its
 * responses carry `page_context.sort_order: "D"`. So the request sends only the documented
 * `sort_column`, and the feed refuses to run when the vendor reports any other direction.
 */
export function contactFeed(o: {
  key: string;
  title: string;
  description: string;
  sortColumn: "created_time" | "last_modified_time";
  idOf(item: Record<string, unknown>): string;
}) {
  return pollFromListAction({
    key: o.key,
    title: o.title,
    description: o.description,
    action: contactList,
    params: [organizationId],
    input: (params: { organizationId?: string }) => ({
      organizationId: params.organizationId,
      page: 1,
      per_page: 100,
      sort_column: o.sortColumn,
    }),
    items: (result) => {
      const r = result as { data?: unknown[]; pageContext?: { sort_order?: string } };
      const order = r.pageContext?.sort_order;
      if (order !== undefined && order !== "D") {
        throw new Error(
          "Zoho Books returned contacts in a non-descending order: cannot poll for new ones.",
        );
      }
      return r.data ?? [];
    },
    idOf: (item) => o.idOf(item as Record<string, unknown>),
    output: [
      { key: "contact_id", type: "string", label: "Contact ID" },
      { key: "contact_name", type: "string", label: "Contact name" },
      { key: "created_time", type: "string", label: "Created time" },
      { key: "last_modified_time", type: "string", label: "Last modified time" },
    ],
    sample: {
      contact_id: "460000000026049",
      contact_name: "Acme",
      created_time: "2026-11-09T12:06:10+0530",
      last_modified_time: "2026-11-09T18:24:51+0530",
    },
    maxPages: 1,
  });
}
