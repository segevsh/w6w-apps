import type { ActionDefinition } from "@w6w/types";
import { ConversionsClient, datasetFromConnection } from "../lib/client.ts";

interface Input {
  datasetId?: string;
  fields?: string;
}

interface Dataset {
  id: string;
  name?: string;
  last_fired_time?: string;
  creation_time?: string;
  data_use_setting?: string;
  is_created_by_business?: boolean;
  enable_automatic_matching?: boolean;
  owner_business?: { id?: string; name?: string };
}

const DEFAULT_FIELDS =
  "id,name,last_fired_time,creation_time,data_use_setting,is_created_by_business,enable_automatic_matching,owner_business";

/**
 * Read the dataset (pixel) node — `GET /{ads-pixel-id}`.
 *
 * The one question the Conversions API itself cannot answer: `POST /events`
 * returns `events_received` whether or not the dataset is the one you meant.
 * `last_fired_time` is the field worth having — it is how you tell "the API
 * accepted my events" from "the dataset is actually receiving them".
 *
 * Needs `ads_read`, which a dataset-scoped Events Manager token generally does
 * NOT carry — expect this to 403 on a `conversions-token` connection and to
 * work on an `oauth2` one. That asymmetry is why neither the auth `test` hook
 * nor the `quota` check probes this endpoint.
 */
const getDataset: ActionDefinition<Input, Dataset> = {
  key: "get-dataset",
  type: "read",
  resource: "dataset",
  title: "Get Dataset",
  description:
    "Read a dataset (pixel) — name, creation time and when it last received an event. Requires ads_read.",
  params: [
    {
      key: "datasetId",
      label: "Dataset (Pixel) ID",
      type: "string",
      hint: "Defaults to the dataset stored on the connection.",
    },
    {
      key: "fields",
      label: "Fields",
      type: "string",
      default: DEFAULT_FIELDS,
      hint: "Comma-separated Graph field list.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Dataset ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "last_fired_time", type: "string", label: "Last fired at" },
    { key: "creation_time", type: "string", label: "Created at" },
    { key: "owner_business", type: "object", label: "Owning business" },
  ],

  execute(input, ctx) {
    const datasetId = datasetFromConnection(ctx.connection, input.datasetId);
    const client = new ConversionsClient(ctx);
    return client.request<Dataset>(`/${datasetId}`, {
      params: { fields: input.fields || DEFAULT_FIELDS },
    });
  },
};

export default getDataset;
