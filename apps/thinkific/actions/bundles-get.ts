import type { ActionDefinition } from "@w6w/types";
import { ThinkificClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

/**
 * `GET /bundles/{id}` — a single Bundle by its numeric id.
 *
 * There is no `GET /bundles` list endpoint — confirmed against the OpenAPI
 * document, which declares only `/bundles/{id}`,
 * `/bundles/{id}/courses` and `/bundles/{id}/enrollments`, all id-scoped.
 * To discover a Bundle's id, list Products (`products-list`) and filter for
 * `productable_type == "Bundle"`, then read `productable_id`.
 */
const bundlesGet: ActionDefinition<Input> = {
  key: "bundles-get",
  type: "read",
  resource: "bundles",
  title: "Get Bundle",
  description: "Fetch a single Bundle by id. Discover ids via Products, filtered by Bundle type.",
  params: [idParam("Bundle")],
  output: [
    { key: "id", type: "number", label: "Bundle ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "description", type: "string", label: "Description" },
    { key: "course_ids", type: "array", label: "Course IDs in this Bundle" },
    { key: "bundle_card_image_url", type: "string", label: "Card image URL" },
  ],

  async execute(input, ctx) {
    return await new ThinkificClient(ctx).json(`/bundles/${encodeURIComponent(input.id)}`);
  },
};

export default bundlesGet;
