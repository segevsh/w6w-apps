import type { ActionDefinition } from "@w6w/types";
import { WsaiClient } from "../lib/client.ts";
import { type PageInput, pageParams, pageQuery } from "../lib/params.ts";

interface Input extends PageInput {
  jsScript?: string;
  returnScriptResult?: boolean;
}

const htmlGet: ActionDefinition<Input> = {
  key: "html-get",
  type: "read",
  resource: "page",
  title: "Get Page HTML",
  description:
    "Fetch a page's full HTML through proxies and headless Chromium, optionally running your own " +
    "JavaScript on it first.",
  params: [
    ...pageParams,
    {
      key: "scripting",
      label: "Custom JavaScript",
      title: "Custom JavaScript",
      type: "section",
      section: "collapsible",
      children: [
        {
          key: "jsScript",
          label: "JavaScript to run",
          type: "code",
          hint: "Evaluated as a script whose value is its last expression (a top-level `return` " +
            "is a syntax error). Only this endpoint runs it.",
        },
        {
          key: "returnScriptResult",
          label: "Return the script's result",
          type: "boolean",
          default: false,
          hint: "Return the script's result instead of the page HTML.",
        },
      ],
    },
  ],
  output: [
    { key: "html", type: "string", label: "Page HTML (absent when the script result is returned)" },
    { key: "scriptResult", type: "string", label: "Script result, as the vendor sent it" },
    { key: "requestId", type: "string", label: "Vendor request id" },
  ],

  async execute(input, ctx) {
    const returnResult = !!input.returnScriptResult;
    const res = await new WsaiClient(ctx).raw("/html", {
      ...pageQuery(input),
      js_script: input.jsScript?.trim() ? input.jsScript : undefined,
      return_script_result: returnResult || undefined,
    });
    return returnResult
      ? { scriptResult: res.text, requestId: res.requestId }
      : { html: res.text, requestId: res.requestId };
  },
};

export default htmlGet;
