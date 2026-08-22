import type { ActionDefinition } from "@w6w/types";
import { MuxClient, PLAYBACK_POLICIES, streamUrl, thumbnailUrl } from "../lib/client.ts";

/**
 * `POST /video/v1/assets/{id}/playback-ids` — mint a way to watch an asset.
 *
 * A playback id **is** the access grant. An asset with none cannot be watched
 * by anybody; an asset with a public one can be watched by anybody who has the
 * id. That is why minting and revoking them, rather than editing the asset, is
 * how access is controlled.
 *
 * The usual pattern is one per audience: a public id for a marketing page, a
 * separate one for an embed somewhere else, so `playback-id-delete` can revoke
 * one without breaking the other.
 *
 * ## `signed` produces an id this app cannot use
 *
 * A signed playback id requires each viewer to present a **JWT signed with one
 * of the account's private signing keys**. Signing needs that key, and only the
 * auth hook may hold a credential — so this app can create such an id and
 * cannot build a working URL for it. The action returns the id and says
 * plainly that the URL has to be signed elsewhere, rather than returning a link
 * that 403s.
 */
const action: ActionDefinition = {
  key: "playback-id-create",
  type: "perform",
  resource: "playback",
  title: "Create a playback ID",
  description:
    "Mint a way to watch an asset — a playback id IS the access grant, so one per audience is " +
    "what makes revoking one possible without breaking the others.",
  idempotent: false,
  params: [
    {
      key: "assetId",
      label: "Asset ID",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "policy",
      label: "Policy",
      type: "select",
      required: true,
      default: "public",
      options: PLAYBACK_POLICIES,
    },
  ],
  output: [
    { key: "data", type: "object", label: "Playback ID" },
    { key: "streamUrl", type: "string", label: "HLS URL (public policy only)" },
    { key: "thumbnailUrl", type: "string", label: "Thumbnail URL (public policy only)" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const assetId = String(p.assetId ?? "").trim();
    if (!assetId) throw new Error("`assetId` is required");
    const policy = String(p.policy ?? "public");

    const body = await new MuxClient(ctx).request<{ data?: { id?: string; policy?: string } }>(
      `/video/v1/assets/${encodeURIComponent(assetId)}/playback-ids`,
      { method: "POST", body: { policy } },
    );

    const id = body?.data?.id;
    if (policy === "signed") {
      ctx.log(
        "warn",
        "this is a SIGNED playback id — a viewer needs a JWT signed with the account's private " +
          "key, which this app cannot produce, so no URL is returned",
        {},
      );
      return { ...body, streamUrl: undefined, thumbnailUrl: undefined };
    }
    return {
      ...body,
      streamUrl: id ? streamUrl(id) : undefined,
      thumbnailUrl: id ? thumbnailUrl(id) : undefined,
    };
  },
};

export default action;
