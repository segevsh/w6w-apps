import type { ActionDefinition } from "@w6w/types";
import { CircleClient, unset } from "../lib/client.ts";
import { listOutput, nameSortOptions, pageParam, perPageParam } from "../lib/params.ts";

/**
 * `GET /member_tags` — the community's member tags.
 *
 * Tags are Circle's segmentation primitive and the ids are needed in three
 * other places: `member-list`'s filter, `member-invite`/`member-update`'s
 * `member_tag_ids`, and `tagged-member-add`. This is the only route that
 * returns them.
 *
 * `is_public` is a real filter, not a display flag — a private tag is visible
 * to admins only, so the same member looks differently tagged depending on who
 * is asking. Filtering on it is how a workflow asks "which of these tags do
 * members actually see".
 *
 * The `sort` enum is shared verbatim with `GET /topics`, down to the default:
 * "Sorting parameters (sort by name in ascending order, name in descending
 * order, and by newest. Default is oldest)".
 */
interface Input {
  name?: string;
  isPublic?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
}

const memberTagList: ActionDefinition<Input> = {
  key: "member-tag-list",
  type: "search",
  resource: "member-tag",
  title: "List Member Tags",
  description:
    "Page through the community's member tags. The source of the tag ids the member and " +
    "tagging actions need.",
  params: [
    { key: "name", label: "Name", type: "string", hint: "Server-side filter by tag name." },
    {
      key: "isPublic",
      label: "Public only",
      type: "boolean",
      hint: "Public tags are visible to members; private ones only to admins.",
    },
    { key: "sort", label: "Sort by", type: "select", options: nameSortOptions },
    pageParam,
    perPageParam,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/member_tags", {
      query: {
        name: unset(input.name),
        // A genuine tri-state: unset means "both", `false` means "private only".
        is_public: input.isPublic,
        sort: unset(input.sort),
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default memberTagList;
