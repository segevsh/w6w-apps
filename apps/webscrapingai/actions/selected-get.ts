import type { ActionDefinition } from "@w6w/types";
import { requireText, WsaiClient } from "../lib/client.ts";
import { type PageInput, pageParams, pageQuery } from "../lib/params.ts";

interface Input extends PageInput {
  selector: string;
}

const selectedGet: ActionDefinition<Input> = {
  key: "selected-get",
  type: "read",
  resource: "page",
  title: "Get HTML of a CSS Selector",
  description:
    "Fetch a page and return the inner HTML of the first element matching a CSS selector. No " +
    'match fails with a 400 "Element not found".',
  params: [
    ...pageParams.slice(0, 1),
    {
      key: "selector",
      label: "CSS selector",
      type: "string",
      required: true,
      placeholder: "h1",
    },
    ...pageParams.slice(1),
  ],
  output: [
    { key: "html", type: "string", label: "Inner HTML of the first match" },
    { key: "requestId", type: "string", label: "Vendor request id" },
  ],

  async execute(input, ctx) {
    const res = await new WsaiClient(ctx).raw("/selected", {
      ...pageQuery(input),
      selector: requireText(input.selector, "CSS selector"),
    });
    return { html: res.text, requestId: res.requestId };
  },
};

export default selectedGet;
