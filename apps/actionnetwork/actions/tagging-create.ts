import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, API_URL, need, seg } from "../lib/client.ts";
import { idParam, type Input } from "../lib/factory.ts";
import { BACKGROUND_PARAM } from "../lib/person.ts";

/** `POST /tags/{id}/taggings` with a link to the person. Deduplicated per person. */
const taggingCreate: ActionDefinition<Input> = {
  key: "tagging-create",
  type: "perform",
  resource: "tagging",
  title: "Tag Person",
  description:
    "Put an existing tag on an existing person. A person carries a tag once; tagging again replaces the old tagging. To tag by name while creating or updating a person, use Create or Update Person instead.",
  idempotent: true,
  params: [
    idParam("tagId", "Tag ID"),
    idParam("personId", "Person ID"),
    BACKGROUND_PARAM,
  ],
  output: [
    { key: "id", type: "string", label: "Tagging id (UUID); needed to remove the tag" },
    { key: "identifiers", type: "array", label: "All identifiers, `system:id`" },
    { key: "item_type", type: "string", label: "Always osdi:person" },
    { key: "created_date", type: "string", label: "Created (ISO 8601)" },
    { key: "modified_date", type: "string", label: "Last modified (ISO 8601)" },
  ],

  execute(input, ctx) {
    const body = {
      _links: {
        "osdi:person": { href: `${API_URL}/people/${seg(need(input, "personId"))}` },
      },
    };
    return new ActionNetworkClient(ctx).create(
      `/tags/${seg(need(input, "tagId"))}/taggings`,
      body,
      input.backgroundRequest === true,
    );
  },
};

export default taggingCreate;
