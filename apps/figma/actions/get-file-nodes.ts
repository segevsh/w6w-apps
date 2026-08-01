import type { ActionDefinition } from "@w6w/types";
import { FigmaClient } from "../lib/client.ts";

interface Input {
  fileKey: string;
  ids: string;
  version?: string;
  depth?: number;
  geometry?: "paths";
  pluginData?: string;
}

/**
 * GET /v1/files/{file_key}/nodes — fetch specific nodes from a file by ID,
 * without pulling the whole document tree. Requires `file_content:read`.
 */
const getFileNodes: ActionDefinition<Input> = {
  key: "get-file-nodes",
  type: "read",
  resource: "file",
  title: "Get File Nodes",
  description: "Fetch one or more specific nodes from a file by ID.",
  params: [
    { key: "fileKey", label: "File key", type: "string", required: true },
    {
      key: "ids",
      label: "Node IDs",
      type: "string",
      required: true,
      hint: 'Comma-separated node IDs, e.g. "1:2,1:3".',
    },
    { key: "version", label: "Version ID", type: "string" },
    { key: "depth", label: "Tree depth", type: "number", validation: { min: 1, integer: true } },
    {
      key: "geometry",
      label: "Geometry",
      type: "select",
      options: [{ label: "Vector paths", value: "paths" }],
      hint: "Set to include vector data.",
    },
    {
      key: "pluginData",
      label: "Plugin data",
      type: "string",
      hint: 'Comma-separated plugin IDs, or "shared".',
    },
  ],
  output: [
    { key: "name", type: "string", label: "File name" },
    { key: "role", type: "string", label: "Role" },
    { key: "lastModified", type: "string", label: "Last modified" },
    { key: "editorType", type: "string", label: "Editor type" },
    { key: "nodes", type: "object", label: "Requested nodes, keyed by ID" },
  ],

  execute(input, ctx) {
    const client = new FigmaClient(ctx);
    return client.request(`/v1/files/${encodeURIComponent(input.fileKey)}/nodes`, {
      query: {
        ids: input.ids,
        version: input.version,
        depth: input.depth,
        geometry: input.geometry,
        plugin_data: input.pluginData,
      },
    });
  },
};

export default getFileNodes;
