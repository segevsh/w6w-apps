import type { ActionDefinition } from "@w6w/types";
import { compact, createdResult, jsonValue, KlipfolioClient } from "../lib/client.ts";

interface Input {
  name: string;
  description?: string;
  connector?: string;
  format?: string;
  refresh_interval?: number;
  properties?: unknown;
  client_id?: string;
}

/** `POST /datasources`. */
const datasourceCreate: ActionDefinition<Input> = {
  key: "datasource-create",
  type: "perform",
  resource: "datasource",
  title: "Create Datasource",
  description: "Create a datasource; the new ID comes back in `id`.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "description", label: "Description", type: "text" },
    {
      key: "connector",
      label: "Connector",
      type: "string",
      hint:
        "Connector id, e.g. simple_rest, db, ftp, google_analytics, google_spreadsheets, hubspot, salesforce, shopify, xero (see the Klipfolio API reference for the full list).",
    },
    { key: "format", label: "Format", type: "string", hint: "Data format, e.g. csv, json or xml." },
    {
      key: "refresh_interval",
      label: "Refresh interval (seconds)",
      type: "number",
      hint: "How often the data source refreshes; 0 means never.",
      validation: { min: 0, integer: true },
    },
    {
      key: "properties",
      label: "Connector properties",
      type: "json",
      hint:
        'Connector-specific properties, e.g. {"endpoint_url": "https://…", "method": "get"} for simple_rest.',
    },
    {
      key: "client_id",
      label: "Client ID",
      type: "string",
      hint: "Act on a client account instead of the company account. Partner accounts only.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "New resource ID" },
    { key: "location", type: "string", label: "Location path of the new resource" },
    {
      key: "instance_location",
      type: "string",
      label: "Location of the new data source instance (data sources only)",
    },
  ],

  async execute(input, ctx) {
    const env = await new KlipfolioClient(ctx).request("POST", `/datasources`, {
      body: compact({
        name: input.name,
        description: input.description,
        connector: input.connector,
        format: input.format,
        refresh_interval: input.refresh_interval,
        properties: jsonValue(input.properties),
        client_id: input.client_id,
      }),
    });
    return createdResult(env);
  },
};

export default datasourceCreate;
