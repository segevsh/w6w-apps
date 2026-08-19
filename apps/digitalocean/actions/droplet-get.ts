import type { ActionDefinition } from "@w6w/types";
import { DigitalOceanClient, numericId } from "../lib/client.ts";

/**
 * `GET /v2/droplets/{id}` — one droplet.
 *
 * ## `networks` is where the addresses are, and there are two of each
 *
 * A droplet has `v4` and `v6` arrays, and each entry has a `type` of `public`
 * or `private`. A workflow that takes `networks.v4[0].ip_address` gets whichever
 * came first, which on a droplet with private networking is often the private
 * one — and connecting to it from outside fails in a way that looks like a
 * firewall problem.
 *
 * So this returns the public and private addresses separately rather than
 * making the caller index into an array whose order is not guaranteed.
 *
 * ## `volume_ids` is what survives the droplet
 *
 * Volumes attached here are separate resources with their own billing. When the
 * droplet is destroyed they are not, and this is where to see what would be
 * left behind.
 *
 * ## `disk` is not resizable downwards, ever
 *
 * The size slug fixes the disk, and a resize that increases it is permanent —
 * see `droplet-resize`. So the current size is worth reading before a resize is
 * considered, because half of that operation is one-way.
 */
const action: ActionDefinition = {
  key: "droplet-get",
  type: "read",
  resource: "droplet",
  title: "Get a droplet",
  description:
    "One droplet, with its PUBLIC and PRIVATE addresses returned separately — indexing " +
    "`networks.v4[0]` gets whichever came first, often the private one, and connecting to that " +
    "from outside looks like a firewall problem.",
  params: [
    {
      key: "dropletId",
      label: "Droplet ID",
      type: "string",
      required: true,
      default: "",
      hint: "Numeric — droplets are numbers while volumes and databases are UUIDs.",
    },
  ],
  output: [
    { key: "droplet", type: "object", label: "The droplet" },
    { key: "name", type: "string", label: "Its name" },
    { key: "status", type: "string", label: "active, off, new — `off` still bills" },
    { key: "billing", type: "boolean", label: "True unless it is archived" },
    { key: "publicIp", type: "string", label: "The public IPv4, if it has one" },
    { key: "privateIp", type: "string", label: "The private IPv4, if it has one" },
    { key: "region", type: "string", label: "Where it is" },
    { key: "size", type: "string", label: "The size slug, which fixes the disk" },
    { key: "diskGb", type: "number", label: "Disk in GB — cannot ever be reduced" },
    { key: "volumeIds", type: "array", label: "Volumes that would survive destroying it" },
    { key: "tags", type: "array", label: "Its tags, which are the only grouping" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const id = numericId(p.dropletId, "dropletId");

    const body = await new DigitalOceanClient(ctx).request<{
      droplet?: {
        name?: string;
        status?: string;
        disk?: number;
        size_slug?: string;
        region?: { slug?: string };
        volume_ids?: string[];
        tags?: string[];
        networks?: { v4?: Array<{ ip_address?: string; type?: string }> };
      };
    }>(`/v2/droplets/${id}`);

    const droplet = body?.droplet;
    const v4 = droplet?.networks?.v4 ?? [];
    // Public and private separately — the array's order is not guaranteed.
    const publicIp = v4.find((entry) => entry?.type === "public")?.ip_address;
    const privateIp = v4.find((entry) => entry?.type === "private")?.ip_address;

    if (droplet?.status === "off") {
      ctx.log(
        "info",
        "this droplet is powered off and still billing — only destroying it stops the charge",
        { id },
      );
    }

    return {
      droplet,
      name: droplet?.name,
      status: droplet?.status,
      billing: droplet?.status !== "archive",
      publicIp,
      privateIp,
      region: droplet?.region?.slug,
      size: droplet?.size_slug,
      diskGb: droplet?.disk,
      // These are separate resources and survive the droplet.
      volumeIds: droplet?.volume_ids ?? [],
      tags: droplet?.tags ?? [],
    };
  },
};

export default action;
