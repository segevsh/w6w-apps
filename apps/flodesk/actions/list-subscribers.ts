import type { ActionDefinition } from "@w6w/types";
import {
  FlodeskClient,
  type FlodeskList,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
} from "../lib/client.ts";

interface Input extends PageInput {
  status?: "active" | "unsubscribed" | "unconfirmed" | "bounced" | "complained" | "cleaned";
  segmentId?: string;
}

const listSubscribers: ActionDefinition<Input> = {
  key: "list-subscribers",
  type: "search",
  resource: "subscriber",
  title: "List Subscribers",
  description:
    "List subscribers one page at a time. Optionally narrow to a single status, or to the members of one segment. Returns `{ meta, data }`.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      hint: "Omit for every status.",
      options: [
        { value: "active", label: "Active — currently receiving marketing email" },
        { value: "unsubscribed", label: "Unsubscribed — opted out" },
        { value: "unconfirmed", label: "Unconfirmed — pending double opt-in" },
        { value: "bounced", label: "Bounced — hard bounce, undeliverable" },
        { value: "complained", label: "Complained — marked an email as spam" },
        { value: "cleaned", label: "Cleaned — removed by Flodesk list hygiene" },
      ],
    },
    {
      key: "segmentId",
      label: "Segment ID",
      type: "string",
      hint: "When set, returns only subscribers who were added to that segment.",
    },
    ...PAGE_PARAMS,
  ],
  output: [
    { key: "data", type: "array", label: "Subscribers" },
    ...PAGE_OUTPUT,
  ],

  execute(input, ctx) {
    return new FlodeskClient(ctx).request<FlodeskList>("/subscribers", {
      query: {
        ...pageQuery(input),
        status: input.status,
        segment_id: input.segmentId,
      },
    });
  },
};

export default listSubscribers;
