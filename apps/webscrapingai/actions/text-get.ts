import type { ActionDefinition } from "@w6w/types";
import { WsaiClient } from "../lib/client.ts";
import { type PageInput, pageParams, pageQuery } from "../lib/params.ts";

interface Input extends PageInput {
  textFormat?: "plain" | "xml" | "json";
  returnLinks?: boolean;
}

const textGet: ActionDefinition<Input> = {
  key: "text-get",
  type: "read",
  resource: "page",
  title: "Get Page Text",
  description:
    "Fetch a page's visible text as Markdown. With the JSON format it also returns the title and " +
    "description, and optionally the page's links.",
  params: [
    ...pageParams.slice(0, 1),
    {
      key: "textFormat",
      label: "Format",
      type: "select",
      default: "plain",
      options: [
        { value: "plain", label: "Plain (Markdown)" },
        { value: "json", label: "JSON (title, description, content)" },
        { value: "xml", label: "XML (title, description, content)" },
      ],
    },
    {
      key: "returnLinks",
      label: "Return links",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "textFormat" }, "json"] },
      hint: "Only with the JSON format. Useful for building crawlers.",
    },
    ...pageParams.slice(1),
  ],
  output: [
    { key: "text", type: "string", label: "Markdown, or the XML document" },
    { key: "title", type: "string", label: "Title (JSON format)" },
    { key: "description", type: "string", label: "Description (JSON format)" },
    { key: "content", type: "string", label: "Markdown content (JSON format)" },
    { key: "requestId", type: "string", label: "Vendor request id" },
  ],

  async execute(input, ctx) {
    const format = input.textFormat || "plain";
    if (!["plain", "xml", "json"].includes(format)) {
      throw new Error("Format must be plain, xml or json");
    }
    const res = await new WsaiClient(ctx).raw("/text", {
      ...pageQuery(input),
      text_format: format === "plain" ? undefined : format,
      return_links: format === "json" && input.returnLinks ? true : undefined,
    });
    if (format === "json") {
      let parsed: unknown;
      try {
        parsed = JSON.parse(res.text);
      } catch {
        throw new Error("WebScraping.AI /text: expected a JSON document for the json format");
      }
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return { ...parsed as Record<string, unknown>, requestId: res.requestId };
      }
    }
    return { text: res.text, requestId: res.requestId };
  },
};

export default textGet;
