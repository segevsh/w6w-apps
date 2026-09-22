import type { ActionDefinition } from "@w6w/types";
import { compact, StreamtimeClient } from "../lib/client.ts";
import { idParam, optionalIdParam } from "../lib/params.ts";

/**
 * `GET /labels` — master labels for a type, or the labels on one entity.
 *
 * The route is two endpoints wearing one path, and the response type changes
 * with it:
 *
 *  - `label_type_id` only → an array of `MasterLabel` (`{ id, name, labelType }`),
 *    the reusable labels defined for that type;
 *  - `label_type_id` **and** `entity_id` → an array of `Label`
 *    (`{ id, name, entityId, labelType }`), the labels *attached* to that
 *    entity.
 *
 * `label_type_id` is **required** and is an integer id, so the first call in any
 * labelling workflow is a search over the entity to learn its type id — or the
 * setup route, which lists the available filters with their types.
 */
interface Input {
  labelTypeId: number;
  entityId?: number;
}

const labelsList: ActionDefinition<Input> = {
  key: "labels-list",
  type: "search",
  resource: "label",
  title: "List Labels",
  description:
    "List the master labels for a label type, or the labels attached to one entity when an entity " +
    "id is given.",
  params: [
    idParam("labelTypeId", "Label Type ID", "Required by Streamtime, for both shapes of response."),
    optionalIdParam(
      "entityId",
      "Entity ID",
      "Provide to get the labels ON one entity instead of the master labels for the type.",
    ),
  ],
  output: [
    {
      key: "labels",
      type: "array",
      label: "Master labels or entity labels — `{ id, name, labelType, [entityId] }`",
    },
  ],

  async execute(input, ctx) {
    const labels = await new StreamtimeClient(ctx).request<unknown[]>("/labels", {
      query: compact({ label_type_id: input.labelTypeId, entity_id: input.entityId }),
    });
    return { labels: labels ?? [] };
  },
};

export default labelsList;
