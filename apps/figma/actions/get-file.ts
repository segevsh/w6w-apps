import type { ActionDefinition } from "@w6w/types";
import { FigmaClient } from "../lib/client.ts";

interface Input {
  fileKey: string;
  version?: string;
  ids?: string;
  depth?: number;
  geometry?: "paths";
  pluginData?: string;
  branchData?: boolean;
}

/**
 * GET /v1/files/{file_key} — fetch a file's document tree and metadata.
 * Requires the `file_content:read` scope.
 */
const getFile: ActionDefinition<Input> = {
  key: "get-file",
  type: "read",
  resource: "file",
  title: "Get File",
  description: "Fetch a Figma file's document tree and metadata.",
  params: [
    {
      key: "fileKey",
      label: "File key",
      type: "string",
      required: true,
      hint: "Parsed from the file URL: figma.com/file/{file_key}/...",
    },
    { key: "version", label: "Version ID", type: "string", hint: "A specific saved version." },
    {
      key: "ids",
      label: "Node IDs",
      type: "string",
      hint: "Comma-separated node IDs to limit the returned tree.",
    },
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
    {
      key: "branchData",
      label: "Include branch metadata",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "name", type: "string", label: "Name" },
    { key: "role", type: "string", label: "Role" },
    { key: "lastModified", type: "string", label: "Last modified" },
    { key: "editorType", type: "string", label: "Editor type" },
    { key: "thumbnailUrl", type: "string", label: "Thumbnail URL" },
    { key: "version", type: "string", label: "Version" },
    { key: "document", type: "object", label: "Document tree" },
    { key: "components", type: "object", label: "Components" },
    { key: "componentSets", type: "object", label: "Component sets" },
    { key: "styles", type: "object", label: "Styles" },
  ],

  execute(input, ctx) {
    const client = new FigmaClient(ctx);
    return client.request(`/v1/files/${encodeURIComponent(input.fileKey)}`, {
      query: {
        version: input.version,
        ids: input.ids,
        depth: input.depth,
        geometry: input.geometry,
        plugin_data: input.pluginData,
        branch_data: input.branchData,
      },
    });
  },
};

export default getFile;
