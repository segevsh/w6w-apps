import type { ActionDefinition } from "@w6w/types";
import {
  type Page,
  type PageInput,
  pageOutput,
  pageParams,
  pageQuery,
  PracticeBetterClient,
} from "../lib/client.ts";

/**
 * `GET /consultant/packages` — list the practice's package **templates**.
 *
 * Security: `[read]`. Pagination is the shared four-control shape every list
 * endpoint here declares (see `lib/client.ts`); this operation declares no other
 * filter.
 *
 * The distinction that matters: this lists the packages the practice *offers*
 * (name and pricing), not the instances a client has bought. Those are
 * `list-package-instances`, and their ids are what `create-package-instance`
 * needs for its `packageId` field.
 */
interface Input extends PageInput {}

const listPackages: ActionDefinition<Input, Page<unknown>> = {
  key: "list-packages",
  type: "search",
  resource: "package",
  title: "List Packages",
  description:
    "List the package templates the practice offers (name and pricing) — not the instances clients " +
    "have purchased.",
  params: [...pageParams],
  output: pageOutput,

  execute(input, ctx) {
    return new PracticeBetterClient(ctx).list("/consultant/packages", {
      query: pageQuery(input),
    });
  },
};

export default listPackages;
