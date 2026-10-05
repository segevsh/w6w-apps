import type { ActionDefinition } from "@w6w/types";
import { listResult, MightyClient, seg } from "../lib/client.ts";

/** `GET /spaces/{space_id}/members` under `/admin/v1/networks/{network_id}` — the Network comes from the Connection. */
interface Input {
  spaceId: number;
  page?: number;
  perPage?: number;
}

const spaceMemberList: ActionDefinition<Input> = {
  key: "space-member-list",
  type: "search",
  resource: "space-member",
  title: "List Space Members",
  description: "List the members of one space, one page at a time.",
  params: [
    {
      key: "spaceId",
      label: "Space ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      hint: "1-based. Defaults to 1.",
      validation: { integer: true, min: 1 },
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      hint: "Items per page, max 100.",
      validation: { integer: true, min: 1, max: 100 },
    },
  ],
  output: [
    {
      key: "items",
      type: "array",
      label:
        "The page of records, when the response carries them as an array under `items`/`data` (null otherwise)",
    },
    { key: "result", type: "object", label: "The full response body, unmodified" },
  ],

  async execute(input, ctx) {
    return listResult(
      await new MightyClient(ctx).request(`/spaces/${seg(input.spaceId)}/members`, {
        query: { page: input.page, per_page: input.perPage },
      }),
    );
  },
};

export default spaceMemberList;
