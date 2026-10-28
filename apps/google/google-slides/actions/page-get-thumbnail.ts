import type { ActionDefinition } from "@w6w/types";
import { extractPresentationId, GoogleSlidesClient } from "../lib/client.ts";

interface Input {
  presentationId: string;
  pageObjectId: string;
  mimeType?: string;
  thumbnailSize?: string;
}

/**
 * `presentations.pages.getThumbnail` —
 * GET /v1/presentations/{presentationId}/pages/{pageObjectId}/thumbnail
 *
 * Renders a page to an image and returns a **URL**, not the bytes. Three things
 * about that URL are easy to get wrong and are therefore stated here and in the
 * output labels:
 *
 *   - it has "a default lifetime of 30 minutes";
 *   - it is "tagged with the account of the requester", so "anyone with the URL
 *     effectively accesses the image as the original requester" — treat it as a
 *     bearer capability, not a public link;
 *   - the only `mimeType` the enum accepts today is `PNG`.
 *
 * This is a **Slides** method, not a Drive export: rendering a slide needs no
 * Drive scope, and this app requests none. (Exporting the *whole deck* to PDF
 * or PPTX is a different thing — that one really is Drive's `files.export`, and
 * it belongs in the `google-drive` app.)
 *
 * Google bills this against the **expensive** read quota — 300/min/project and
 * 60/min/user, a tenth of the ordinary read budget. Thumbnailing every slide in
 * a long deck in a tight loop will 429.
 */
const pageGetThumbnail: ActionDefinition<Input> = {
  key: "page-get-thumbnail",
  type: "read",
  resource: "page",
  title: "Get Page Thumbnail",
  description:
    "Render a page to a PNG and return a short-lived URL to it. Counts against Google's expensive-read quota.",
  params: [
    { key: "presentationId", label: "Presentation ID or URL", type: "string", required: true },
    { key: "pageObjectId", label: "Page Object ID", type: "string", required: true },
    {
      key: "mimeType",
      label: "MIME Type",
      type: "select",
      options: [{ value: "PNG", label: "PNG" }],
      hint: "PNG is the only value the API accepts. Defaults to PNG when omitted.",
    },
    {
      key: "thumbnailSize",
      label: "Thumbnail Size",
      type: "select",
      options: [
        { value: "LARGE", label: "LARGE — 1600px wide" },
        { value: "MEDIUM", label: "MEDIUM — 800px wide" },
        { value: "SMALL", label: "SMALL — 200px wide" },
        { value: "WIDTH2000_PX", label: "WIDTH2000_PX — 2000px wide" },
      ],
      hint: "Omit to let Google choose; the server default is not guaranteed stable.",
    },
  ],
  output: [
    {
      key: "contentUrl",
      type: "string",
      label: "Image URL — expires in ~30 minutes and carries the requester's access",
    },
    { key: "width", type: "number", label: "Width in pixels" },
    { key: "height", type: "number", label: "Height in pixels" },
  ],

  execute(input, ctx) {
    const client = new GoogleSlidesClient(ctx);
    return client.request(
      `/presentations/${encodeURIComponent(extractPresentationId(input.presentationId))}/pages/${
        encodeURIComponent(input.pageObjectId)
      }/thumbnail`,
      {
        query: {
          "thumbnailProperties.mimeType": input.mimeType,
          "thumbnailProperties.thumbnailSize": input.thumbnailSize,
        },
      },
    );
  },
};

export default pageGetThumbnail;
