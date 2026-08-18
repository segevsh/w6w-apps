import type { ActionDefinition } from "@w6w/types";
import { AlgoliaClient, csv } from "../lib/client.ts";
import { INDEX_PARAM } from "../lib/params.ts";

/**
 * `GET /1/indexes/{indexName}/{objectID}` — verified against Algolia's OpenAPI
 * document (`getObject`; ACL `search`).
 */
const action: ActionDefinition = {
  key: "object-get",
  type: "read",
  resource: "object",
  title: "Get a record",
  description: "Retrieve one record by its objectID.",
  params: [
    INDEX_PARAM,
    { key: "objectID", label: "Object ID", type: "string", required: true, default: "" },
    {
      key: "attributesToRetrieve",
      label: "Attributes To Retrieve",
      type: "string",
      default: "",
      hint: "Comma-separated. Leave blank for the whole record.",
    },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const indexName = String(p.indexName ?? "").trim();
    const objectID = String(p.objectID ?? "").trim();
    if (!indexName) throw new Error("`indexName` is required");
    if (!objectID) throw new Error("`objectID` is required");

    const attrs = csv(p.attributesToRetrieve);
    ctx.log("info", "getting Algolia record", { indexName, objectID });

    return await new AlgoliaClient(ctx).request(
      `/1/indexes/${encodeURIComponent(indexName)}/${encodeURIComponent(objectID)}`,
      { read: true, query: { attributesToRetrieve: attrs?.join(",") } },
    );
  },
};

export default action;
