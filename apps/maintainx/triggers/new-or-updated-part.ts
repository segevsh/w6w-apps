import type { ActionDefinition } from "@w6w/types";
import { idOfRevision, sortedFeed } from "../lib/triggers.ts";
import partList from "../actions/part-list.ts";

/** `GET /v1/parts?sort=-updatedAt&limit=100` — the vendor OpenAPI lists `-updatedAt` in the `sort` enum (verified 2026-11-10). */
export default sortedFeed({
  key: "new-or-updated-part",
  title: "New or Updated Part",
  description:
    "The run gets each spare part that was created or edited (stock changes included), with its new quantities.",
  action: partList as ActionDefinition,
  listKey: "parts",
  sort: "-updatedAt",
  idOf: idOfRevision,
  output: [
    { key: "id", type: "number", label: "Part ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "availableQuantity", type: "number", label: "Available quantity" },
    { key: "minimumQuantity", type: "number", label: "Minimum quantity" },
    { key: "createdAt", type: "string", label: "Created at" },
    { key: "updatedAt", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 71,
    name: "Drive belt",
    availableQuantity: 3,
    minimumQuantity: 4,
    createdAt: "2026-11-09T09:00:00.000Z",
    updatedAt: "2026-11-10T09:00:00.000Z",
  },
});
