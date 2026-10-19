import type { Param } from "@w6w/types";

export interface PageContentInput {
  properties?: Record<string, unknown>;
  children?: unknown[];
  content?: unknown[];
  markdown?: string;
  markdownVersion?: "v1" | "v2";
  allowAsync?: boolean;
  template?: Record<string, unknown>;
  position?: Record<string, unknown>;
  notifications?: Record<string, unknown>;
  icon?: unknown;
  cover?: unknown;
  filterProperties?: string[];
}

export const pageContentParams: Param[] = [
  {
    key: "properties",
    label: "Properties",
    type: "json",
    hint:
      'Notion property values keyed by name or ID. For a database row: {"Name":{"title":[{"text":{"content":"Hello"}}]}}.',
  },
  {
    key: "markdown",
    label: "Content (Markdown)",
    type: "text",
    hint: "Page content. Choose Markdown, Children, Content blocks, or a template.",
  },
  {
    key: "children",
    label: "Children (blocks)",
    type: "json",
    advanced: true,
    hint: "Array of Notion block objects.",
  },
  {
    key: "content",
    label: "Content blocks",
    type: "json",
    advanced: true,
    hint: "Alternative to Children. Do not provide both.",
  },
  {
    key: "template",
    label: "Template",
    type: "json",
    advanced: true,
    hint:
      'For example {"type":"default"} or {"type":"template_id","template_id":"…"}. Templates are applied asynchronously.',
  },
  {
    key: "markdownVersion",
    label: "Markdown version",
    type: "select",
    options: [{ value: "v1", label: "Enhanced Markdown (v1)" }, {
      value: "v2",
      label: "Notion-flavored Markdown (v2 preview)",
    }],
    advanced: true,
  },
  {
    key: "allowAsync",
    label: "Allow asynchronous creation",
    type: "boolean",
    advanced: true,
    hint: "Markdown only. May return an async task; poll with Get Async Task.",
  },
  { key: "position", label: "Position", type: "json", advanced: true },
  {
    key: "notifications",
    label: "Notifications",
    type: "json",
    advanced: true,
    hint: '{"mode":"silent"} suppresses notifications; automations and webhooks still run.',
  },
  { key: "icon", label: "Icon", type: "json", advanced: true },
  { key: "cover", label: "Cover", type: "json", advanced: true },
  {
    key: "filterProperties",
    label: "Response property names or IDs",
    type: "array",
    item: { type: "string" },
    advanced: true,
  },
];

export function buildPageBody(input: PageContentInput): Record<string, unknown> {
  const contentCount =
    [input.children, input.content, input.markdown].filter((v) => v !== undefined).length;
  if (contentCount > 1) {
    throw new Error("Choose only one content format: Markdown, Children, or Content blocks.");
  }
  if (input.template && input.template.type !== "none" && contentCount) {
    throw new Error("A page template cannot be combined with explicit page content.");
  }
  if (
    (input.markdownVersion !== undefined || input.allowAsync === true) &&
    input.markdown === undefined
  ) {
    throw new Error("Markdown version and asynchronous creation require Markdown content.");
  }
  return {
    properties: input.properties,
    children: input.children,
    content: input.content,
    markdown: input.markdown,
    markdown_version: input.markdownVersion,
    allow_async: input.allowAsync,
    template: input.template,
    position: input.position,
    notifications: input.notifications,
    icon: input.icon,
    cover: input.cover,
  };
}

export function pageIdFromUrl(value: string): string {
  if (!/^https?:\/\//i.test(value)) return value.trim();
  const url = new URL(value);
  if (
    url.hostname !== "notion.so" && url.hostname !== "notion.site" &&
    !url.hostname.endsWith(".notion.so") && !url.hostname.endsWith(".notion.site")
  ) {
    throw new Error("Paste a Notion page URL or its page ID.");
  }
  const id = url.pathname.match(/([a-f\d]{32}|[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12})\/?$/i)?.[1];
  if (!id) throw new Error("Could not find a page ID in this URL. Use Search Pages to find it.");
  return id;
}
