import type { ActionDefinition } from "@w6w/types";
import { DELIVERY_BASE, displayOf } from "../lib/client.ts";
import { RESOURCE_TYPE_PARAM } from "../lib/params.ts";

/**
 * Build a delivery URL. **This action makes no API call.**
 *
 * It is here because a transformation URL is the thing Cloudinary is actually
 * for, and because there is no endpoint that returns one: a delivery URL is
 * assembled from the cloud name, the resource and delivery type, the
 * transformation string and the public id, in that order. Every SDK ships this
 * as a local function, and a workflow that has to paste one together by hand
 * gets the segment order wrong.
 *
 *   https://res.cloudinary.com/{cloud}/{resource_type}/{type}/{transformation}/{public_id}.{format}
 *
 * The **version** segment (`v1234567890`) is optional and worth understanding:
 * including it makes the URL immutable — overwriting the asset does not change
 * what that URL serves, which is what you want in a cached page. Omitting it
 * means the URL always serves the current asset, at the cost of the CDN
 * possibly holding the old bytes until `invalidate` clears them. `asset-get`
 * and `asset-upload` both return the version.
 *
 * ## What this deliberately cannot do
 *
 * **Signed URLs.** `private` and `authenticated` assets need a signature
 * computed from the account's API secret, and the sandbox lets only the auth
 * `sign` hook near a credential — a URL is not a request, so there is nothing
 * for it to sign. This action refuses those delivery types rather than
 * returning a URL that will 401 at the edge.
 *
 * The cloud name comes from the Connection, so the URL matches the account the
 * rest of the workflow is talking to.
 */
const action: ActionDefinition = {
  key: "asset-url",
  type: "read",
  resource: "asset",
  title: "Build a delivery URL",
  description:
    "Assemble a transformation URL from a public id — locally, with no API call. Refuses " +
    "private and authenticated assets, which need a signature this app cannot produce.",
  params: [
    {
      key: "publicId",
      label: "Public ID",
      type: "string",
      required: true,
      default: "",
      placeholder: "products/hero-shot",
    },
    {
      key: "transformation",
      label: "Transformation",
      type: "string",
      default: "",
      placeholder: "w_800,h_600,c_fill,q_auto,f_auto",
      hint: "Cloudinary's transformation syntax, or a named transformation as `t_name`. " +
        "`q_auto,f_auto` is the pair worth having on almost everything.",
    },
    RESOURCE_TYPE_PARAM,
    {
      key: "type",
      label: "Delivery Type",
      type: "select",
      default: "upload",
      options: [
        { value: "upload", label: "Upload — publicly deliverable" },
        { value: "fetch", label: "Fetch — a remote URL Cloudinary proxies" },
      ],
      hint: "Private and authenticated assets are deliberately absent: their URLs need a " +
        "signature, which cannot be produced here.",
    },
    {
      key: "version",
      label: "Version",
      type: "string",
      default: "",
      hint: "From `asset-get` or an upload response. Including it makes the URL immutable — " +
        "overwriting the asset will not change what this URL serves.",
    },
    {
      key: "format",
      label: "Format Extension",
      type: "string",
      default: "",
      placeholder: "webp",
      hint: "Forces a format by extension. Usually better done with `f_auto` in the " +
        "transformation, which picks per browser.",
    },
  ],
  output: [
    { key: "url", type: "string", label: "Delivery URL" },
    { key: "publicId", type: "string", label: "Public ID" },
  ],

  execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const publicId = String(p.publicId ?? "").trim().replace(/^\/+/, "");
    if (!publicId) throw new Error("`publicId` is required");

    const type = String(p.type ?? "upload");
    if (type === "private" || type === "authenticated") {
      throw new Error(
        `a \`${type}\` asset needs a SIGNED delivery URL, and the signature requires the API ` +
          "secret — which only the auth hook may touch. Use Cloudinary's own SDK or a signed " +
          "URL from the console for these.",
      );
    }

    const cloudName = String(displayOf(ctx.connection).cloudName ?? "");
    if (!cloudName) {
      throw new Error("this connection has no cloud name — reconnect the Cloudinary account");
    }

    const version = String(p.version ?? "").trim().replace(/^v/, "");
    const format = String(p.format ?? "").trim().replace(/^\./, "");
    const segments = [
      cloudName,
      String(p.resourceType ?? "image"),
      type,
      String(p.transformation ?? "").trim(),
      version ? `v${version}` : "",
      // Slashes in the public id are path structure and must survive.
      publicId.split("/").map(encodeURIComponent).join("/"),
    ].filter(Boolean);

    const url = `${DELIVERY_BASE}/${segments.join("/")}${format ? `.${format}` : ""}`;
    return { url, publicId };
  },
};

export default action;
