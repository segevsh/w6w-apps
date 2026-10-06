import { getAction, projectIdParam, screenIdParam, screenPath } from "../lib/actions.ts";

export default getAction({
  key: "get-latest-screen-version",
  resource: "screen_version",
  title: "Get Latest Screen Version",
  description:
    "Get the latest version of a screen, with its image, layers and assets (GET /v1/projects/{project_id}/screens/{screen_id}/versions/latest).",
  params: [projectIdParam, screenIdParam],
  path: (i) => `${screenPath(i)}/versions/latest`,
  output: [
    { key: "id", type: "string", label: "Version ID" },
    { key: "creator", type: "object", label: "Creator" },
    { key: "commit", type: "object", label: "Commit (message, author, color)" },
    { key: "image_url", type: "string", label: "Image URL" },
    { key: "thumbnails", type: "object", label: "Thumbnails" },
    { key: "width", type: "number", label: "Width" },
    { key: "height", type: "number", label: "Height" },
    { key: "density_scale", type: "number", label: "Density scale" },
    { key: "source", type: "string", label: "Source design tool" },
    { key: "source_file_url", type: "string", label: "Source file URL" },
    { key: "background_color", type: "object", label: "Background color" },
    { key: "links", type: "array", label: "Links" },
    { key: "layers", type: "array", label: "Layers" },
    { key: "assets", type: "array", label: "Assets" },
  ],
});
