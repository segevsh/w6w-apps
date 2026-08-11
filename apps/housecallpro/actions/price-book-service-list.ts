import type { ActionDefinition } from "@w6w/types";
import { HousecallClient, type NormalizedList, toList } from "../lib/client.ts";
import {
  companyIdParam,
  listOutput,
  paginationParams,
  PARTNER_ONLY_NOTE,
  sortDirectionParam,
} from "../lib/params.ts";

/**
 * `GET /api/price_book/services` — the price book's services.
 *
 * This is the endpoint that settles how this app sends array query parameters.
 * Its `expand` parameter is the only one in the whole reference whose wire
 * format is written out in prose, and it says brackets: "Sent as repeated
 * `expand[]` query params (e.g.
 * `expand[]=service_materials&expand[]=service_labor_rates`)", repeated verbatim
 * in the 2026-06-29 changelog. Its sibling `filters` parameter is
 * `filters[][property]`, bracketed too. Every array parameter in this app is
 * serialized that way — see `lib/client.ts#buildQuery` for why the prose wins
 * over the parameter's own contradictory `style: form, explode: true`.
 *
 * The `expand` values matter: without them `service_materials` and
 * `service_labor_rates` come back as `{"object": "list", "data": []}` — present,
 * empty, and easy to read as "this service has no materials".
 *
 * `filters` is deliberately not exposed. It is a `deepObject` of
 * `filters[][property]` / `filters[][operator]` / `filters[][value]` triples,
 * which `buildQuery` does not implement; adding a parameter that silently
 * serialized wrong would be worse than not having it.
 */
interface Input {
  q?: string;
  expand?: string[] | string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
  companyId?: string;
}

const priceBookServiceList: ActionDefinition<Input, NormalizedList> = {
  key: "price-book-service-list",
  type: "search",
  resource: "price-book",
  title: "Find Price Book Services",
  description:
    "Search the price book's services by name, description or task number. Materials and labor " +
    "rates come back as empty lists unless expanded. " + PARTNER_ONLY_NOTE,
  params: [
    {
      key: "q",
      label: "Search",
      type: "string",
      hint: "Matches a service by name, description or task number.",
    },
    {
      key: "expand",
      label: "Expand",
      type: "multiselect",
      options: [
        { value: "service_materials", label: "Service materials" },
        { value: "service_labor_rates", label: "Service labor rates" },
      ],
      hint: "Each is returned as an empty list unless named here.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      default: "created_at",
      hint: "A service attribute. The reference documents the default but no list of values.",
    },
    sortDirectionParam,
    ...paginationParams(50),
    companyIdParam,
  ],
  output: listOutput("Price book services"),

  execute(input, ctx) {
    return new HousecallClient(ctx).list("/api/price_book/services", "services", {
      companyId: input.companyId,
      query: {
        q: input.q,
        expand: toList(input.expand),
        page: input.page,
        page_size: input.pageSize,
        sort_by: input.sortBy,
        sort_direction: input.sortDirection,
      },
    });
  },
};

export default priceBookServiceList;
