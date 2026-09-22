import type { ActionDefinition } from "@w6w/types";
import {
  type Page,
  type PageInput,
  pageOutput,
  pageParams,
  pageQuery,
  PracticeBetterClient,
  toList,
} from "../lib/client.ts";

/**
 * `GET /consultant/packages/instances` — list packages clients have purchased.
 *
 * Security: `[read]`. Pagination is the shared four-control shape every list
 * endpoint here declares (see `lib/client.ts`).
 *
 * This is the client-side half of the package model: `list-packages` is the
 * template a practice sells, and an instance is one client's purchase of it —
 * with its own expiry, session allowances and status. `expired` and `status`
 * narrow to the ones a billing or follow-up workflow cares about.
 *
 * `status` is typed in the document as an array of `PackageInstanceStatus`
 * `{name, value}` pairs; the document does not publish the names, so this action
 * takes them as free text (sent as repeated query keys) rather than offering a
 * list it would have had to invent.
 */
interface Input extends PageInput {
  consultants?: string[] | string;
  packages?: string[] | string;
  records?: string[] | string;
  expired?: boolean;
  status?: string[] | string;
}

const listPackageInstances: ActionDefinition<Input, Page<unknown>> = {
  key: "list-package-instances",
  type: "search",
  resource: "package",
  title: "List Package Instances",
  description:
    "List the package instances clients have purchased, filtered by consultant, package, client " +
    "record, expiry and status.",
  params: [
    ...pageParams,
    {
      key: "consultants",
      label: "Consultants",
      type: "multiselect",
      hint: "One or more consultant ids.",
    },
    {
      key: "packages",
      label: "Packages",
      type: "multiselect",
      hint: "One or more package template ids, as returned by `list-packages`.",
    },
    {
      key: "records",
      label: "Client records",
      type: "multiselect",
      hint: "One or more client record ids.",
    },
    {
      key: "expired",
      label: "Expired",
      type: "boolean",
      hint: "Filter to instances that have expired (or, set false, to ones that have not).",
    },
    {
      key: "status",
      label: "Statuses",
      type: "multiselect",
      hint:
        "One or more `PackageInstanceStatus` names. The document does not publish the name list, " +
        "so they are typed by hand; each is sent as a repeated `status` query key.",
    },
  ],
  output: pageOutput,

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).list("/consultant/packages/instances", {
      query: {
        ...pageQuery(input),
        consultants: toList(input.consultants),
        packages: toList(input.packages),
        records: toList(input.records),
        expired: input.expired,
        status: toList(input.status),
      },
    });
  },
};

export default listPackageInstances;
