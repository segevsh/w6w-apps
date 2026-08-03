import type { ActionDefinition } from "@w6w/types";
import { DiscourseClient } from "../lib/client.ts";
import { groupOutput } from "../lib/params.ts";

/**
 * `GET /groups/{name}.json` — one group, keyed on its **name**.
 *
 * Discourse publishes both forms: this one, whose path parameter is documented
 * as "Use group name instead of id", and `GET /groups/by-id/{id}.json`. The
 * name-keyed route is the one shipped because the sibling membership endpoints
 * (`group-add-members`, `group-remove-members`) are keyed on the numeric id, and
 * this action is how a workflow turns a name it knows into the id those need.
 *
 * The response envelopes under `group`, which is unwrapped.
 */
interface Input {
  name: string;
}

const groupGet: ActionDefinition<Input> = {
  key: "group-get",
  type: "read",
  resource: "group",
  title: "Get Group",
  description: "Fetch a group by name — including the numeric id the membership actions need.",
  params: [
    {
      key: "name",
      label: "Group name",
      type: "string",
      required: true,
      hint: "The group's name, not its id. The response carries the id.",
    },
  ],
  output: groupOutput,

  async execute(input, ctx) {
    const body = await new DiscourseClient(ctx).request<{ group?: unknown }>(
      `/groups/${encodeURIComponent(input.name)}.json`,
    );
    return body?.group ?? body;
  },
};

export default groupGet;
