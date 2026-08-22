import type { ActionDefinition } from "@w6w/types";
import { HOSTS, MapsClient, query } from "../lib/client.ts";

/**
 * `GET places.googleapis.com/v1/{photo_name}/media` — resolve a place photo
 * reference into a URL.
 *
 * ## By default this endpoint returns an image, not JSON
 *
 * Called plainly it answers with a **302 to the image bytes**, which is right
 * for an `<img src>` and useless inside a workflow: a redirect to binary data
 * is not something a JSON step can hold. `skipHttpRedirect=true` changes it to
 * return `{name, photoUri}` instead, and this action always sets it.
 *
 * ## The URL it hands back is short-lived
 *
 * `photoUri` points at Google's own storage and **expires**. It is a URL to
 * fetch or hand to a browser now, not one to write into a database and serve
 * next month — that produces a page full of broken images with no error
 * anywhere. What is durable is the **photo name** (`places/…/photos/…`), which
 * comes from `places.photos` on a search or details call, and which can be
 * resolved again whenever it is needed.
 *
 * ## Asking for a size is not optional in practice
 *
 * At least one of `maxWidthPx` and `maxHeightPx` must be given, and the largest
 * accepted is 4800. Photos are user-uploaded and some are enormous; asking for
 * the original when the workflow wants a thumbnail moves several megabytes for
 * nothing.
 */
const action: ActionDefinition = {
  key: "place-photo",
  type: "read",
  resource: "place",
  title: "Get a place photo URL",
  description:
    "Resolve a photo reference into a URL. The URL EXPIRES — store the photo name and re-resolve " +
    "it, never the URL itself.",
  params: [
    {
      key: "photoName",
      label: "Photo Name",
      type: "string",
      required: true,
      default: "",
      hint: "From `places.photos[].name` on a search or details call — `places/…/photos/…`. " +
        "This is the durable handle; the URL is not.",
    },
    {
      key: "maxWidthPx",
      label: "Max Width (px)",
      type: "number",
      default: 800,
      hint: "1 to 4800. Give this or a height — photos are user-uploaded and some are enormous.",
    },
    {
      key: "maxHeightPx",
      label: "Max Height (px)",
      type: "number",
      default: 0,
      advanced: true,
    },
  ],
  output: [
    { key: "photoUri", type: "string", label: "A URL to the image — short-lived" },
    { key: "name", type: "string", label: "The photo name, which is the durable handle" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const raw = String(p.photoName ?? "").trim();
    if (!raw) throw new Error("`photoName` is required");
    if (!raw.includes("/photos/")) {
      throw new Error(
        "`photoName` must be a photo resource name like `places/ChIJ…/photos/AeJ…` — take it " +
          "from `places.photos[].name` on a search or details call",
      );
    }

    const width = Number(p.maxWidthPx ?? 0);
    const height = Number(p.maxHeightPx ?? 0);
    if (width <= 0 && height <= 0) {
      throw new Error("give `maxWidthPx` or `maxHeightPx` — Google requires at least one");
    }

    const result = await new MapsClient(ctx).rpc<{ name?: string; photoUri?: string }>(
      HOSTS.places,
      `/v1/${raw.replace(/^\/+/, "")}/media`,
      {
        query: query({
          maxWidthPx: width > 0 ? Math.min(4800, width) : undefined,
          maxHeightPx: height > 0 ? Math.min(4800, height) : undefined,
          // Without this the endpoint 302s to the image bytes.
          skipHttpRedirect: true,
        }),
      },
    );

    return { photoUri: result?.photoUri, name: result?.name ?? raw };
  },
};

export default action;
