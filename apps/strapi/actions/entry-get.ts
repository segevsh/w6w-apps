import type { ActionDefinition } from "@w6w/types";
import { StrapiClient } from "../lib/client.ts";
import {
  collectionParam,
  fieldsParam,
  idParam,
  populateParam,
  statusParam,
} from "../lib/params.ts";

interface Input {
  collection: string;
  id: string;
  fields?: string;
  populate?: unknown;
  status?: string;
}

/** `GET /api/<collection>/<id>` — Strapi's find-one. */
const entryGet: ActionDefinition<Input> = {
  key: "entry-get",
  type: "read",
  resource: "entry",
  title: "Get Entry",
  description: "Retrieve a single entry by ID.",
  params: [collectionParam, idParam, fieldsParam, populateParam, statusParam],
  output: [{ key: "data", type: "object", label: "Entry" }],

  execute(input, ctx) {
    const client = StrapiClient.fromConnection(ctx);
    const fields = input.fields
      ? input.fields.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;
    return client.request(
      `/api/${encodeURIComponent(input.collection)}/${encodeURIComponent(input.id)}`,
      {
        query: { fields, populate: input.populate, status: input.status },
      },
    );
  },
};

export default entryGet;
