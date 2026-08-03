import type { ActionDefinition } from "@w6w/types";
import { extractPresentationId, GoogleSlidesClient } from "../lib/client.ts";

interface Input {
  presentationId: string;
  pageObjectId: string;
}

/**
 * `presentations.pages.get` — GET /v1/presentations/{presentationId}/pages/{pageObjectId}
 *
 * One page rather than the whole deck. "Page" is the API's umbrella noun: the
 * returned `Page.pageType` is one of `SLIDE`, `MASTER`, `LAYOUT`, `NOTES` or
 * `NOTES_MASTER`, and this method will fetch any of them by object ID.
 *
 * Prefer this over `presentation-get` when you already know the slide you want
 * — it is a normal read for quota purposes and returns a fraction of the bytes.
 */
const pageGet: ActionDefinition<Input> = {
  key: "page-get",
  type: "read",
  resource: "page",
  title: "Get Page",
  description:
    "Fetch a single page (slide, layout, master or notes page) and its page elements by object ID.",
  params: [
    { key: "presentationId", label: "Presentation ID or URL", type: "string", required: true },
    {
      key: "pageObjectId",
      label: "Page Object ID",
      type: "string",
      required: true,
      hint: "The `objectId` of the page — read it from the Get Presentation output.",
    },
  ],
  output: [
    { key: "objectId", type: "string", label: "Page object ID" },
    { key: "pageType", type: "string", label: "SLIDE | MASTER | LAYOUT | NOTES | NOTES_MASTER" },
    { key: "pageElements", type: "array", label: "Page elements" },
    { key: "pageProperties", type: "object", label: "Page properties" },
    { key: "slideProperties", type: "object", label: "Slide properties (SLIDE pages only)" },
    { key: "layoutProperties", type: "object", label: "Layout properties (LAYOUT pages only)" },
    { key: "revisionId", type: "string", label: "Presentation revision ID" },
  ],

  execute(input, ctx) {
    const client = new GoogleSlidesClient(ctx);
    return client.request(
      `/presentations/${encodeURIComponent(extractPresentationId(input.presentationId))}/pages/${
        encodeURIComponent(input.pageObjectId)
      }`,
    );
  },
};

export default pageGet;
