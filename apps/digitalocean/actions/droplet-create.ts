import type { ActionDefinition } from "@w6w/types";
import { compact, csv, DigitalOceanClient } from "../lib/client.ts";

/**
 * `POST /v2/droplets` — create a droplet.
 *
 * ## The response is a droplet that does not work yet
 *
 * A 202 comes back with the droplet in status `new`, no IP address assigned,
 * and an action in `links.actions` still `in-progress`. It takes tens of
 * seconds to become `active`, and a workflow that creates and then connects
 * fails on the second step every time.
 *
 * So this returns the action id and says the droplet is not ready, rather than
 * implying a finished thing.
 *
 * ## SSH keys are the difference between a usable droplet and a root password
 *
 * With no `ssh_keys`, DigitalOcean emails a root password in plain text and the
 * droplet accepts password logins. With keys, it does not. That is a real
 * security difference decided by an optional field, so this warns when it is
 * left empty.
 *
 * ## Backups and monitoring are decided here and cost differently
 *
 * `backups` adds 20% to the droplet's price and can only be enabled at creation
 * or via a separate action afterwards. `monitoring` is free and off by default,
 * which is the wrong way round for anything that matters — so this defaults it
 * on.
 *
 * ## The size fixes the disk, and the disk is one-way
 *
 * Choosing a size chooses a disk, and a disk can be grown and **never
 * shrunk** — see `droplet-resize`. Starting small is reversible; starting large
 * is not.
 */
const action: ActionDefinition = {
  key: "droplet-create",
  type: "perform",
  resource: "droplet",
  title: "Create a droplet",
  description:
    "Create a droplet. The response is a droplet that is NOT READY — status `new`, no IP yet — " +
    "so a workflow that creates and then connects fails. Without SSH keys, DigitalOcean emails " +
    "a plain-text root password and allows password logins.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      hint: "Also becomes the hostname.",
    },
    {
      key: "region",
      label: "Region",
      type: "string",
      required: true,
      default: "",
      placeholder: "fra1",
      hint: "A droplet cannot be moved between regions — a snapshot and a rebuild is the way.",
    },
    {
      key: "size",
      label: "Size",
      type: "string",
      required: true,
      default: "",
      placeholder: "s-1vcpu-1gb",
      hint: "Fixes the disk, and a disk can be grown but NEVER shrunk. Starting small is the " +
        "reversible direction.",
    },
    {
      key: "image",
      label: "Image",
      type: "string",
      required: true,
      default: "",
      placeholder: "ubuntu-24-04-x64",
      hint: "A distribution slug, or a numeric snapshot or custom image id.",
    },
    {
      key: "sshKeys",
      label: "SSH Key IDs or Fingerprints",
      type: "string",
      default: "",
      hint: "Comma-separated. LEAVING THIS EMPTY makes DigitalOcean email a root password in " +
        "plain text and enable password logins.",
    },
    {
      key: "confirmNoSshKeys",
      label: "I want a root password emailed instead",
      type: "boolean",
      default: false,
      showIf: { "==": [{ var: "sshKeys" }, ""] },
    },
    {
      key: "monitoring",
      label: "Monitoring",
      type: "boolean",
      default: true,
      hint: "Free, and off by default in the API. On here.",
    },
    {
      key: "backups",
      label: "Backups",
      type: "boolean",
      default: false,
      hint: "Adds 20% to the droplet's price. Enabling it later is a separate action.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "string",
      default: "",
      hint: "The only grouping DigitalOcean has — worth setting, because filtering later depends " +
        "on it.",
    },
    {
      key: "userData",
      label: "Cloud-init User Data",
      type: "string",
      default: "",
      advanced: true,
      hint: "Runs on first boot. Not encrypted at rest and readable from the droplet's metadata " +
        "service, so not a place for secrets.",
    },
    {
      key: "vpcUuid",
      label: "VPC",
      type: "string",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "droplet", type: "object", label: "The droplet as created" },
    { key: "id", type: "number", label: "Its id" },
    { key: "status", type: "string", label: "`new` — it is not usable yet" },
    { key: "ready", type: "boolean", label: "Always false here; poll `droplet-get`" },
    { key: "actionId", type: "number", label: "The create action still running" },
    { key: "passwordEmailed", type: "boolean", label: "True when no SSH key was given" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    const region = String(p.region ?? "").trim();
    const size = String(p.size ?? "").trim();
    const image = String(p.image ?? "").trim();
    for (
      const [field, value] of [["name", name], ["region", region], ["size", size], ["image", image]]
    ) {
      if (!value) throw new Error(`\`${field}\` is required`);
    }

    const sshKeys = csv(p.sshKeys);
    if (!sshKeys && p.confirmNoSshKeys !== true) {
      throw new Error(
        "set `confirmNoSshKeys`, or give `sshKeys` — with no key, DigitalOcean generates a root " +
          "password, EMAILS IT IN PLAIN TEXT, and leaves password authentication enabled on the " +
          "droplet. With a key it does none of those",
      );
    }

    const body = compact({
      name,
      region,
      size,
      image: /^\d+$/.test(image) ? Number(image) : image,
      ssh_keys: sshKeys,
      tags: csv(p.tags),
      user_data: p.userData,
      vpc_uuid: p.vpcUuid,
    });
    // Both are meaningful when false.
    body.monitoring = p.monitoring !== false;
    body.backups = p.backups === true;

    const result = await new DigitalOceanClient(ctx).request<{
      droplet?: { id?: number; status?: string };
      links?: { actions?: Array<{ id?: number; rel?: string }> };
    }>("/v2/droplets", { method: "POST", body });

    const droplet = result?.droplet;
    const actionId = result?.links?.actions?.[0]?.id;

    ctx.log(
      sshKeys ? "info" : "warn",
      sshKeys
        ? "created a droplet — it is not usable until it reaches `active`"
        : "created a droplet with NO SSH key — a root password has been emailed in plain text " +
          "and password logins are enabled",
      { id: droplet?.id, backups: body.backups },
    );

    return {
      droplet,
      id: droplet?.id,
      status: droplet?.status,
      // A 202 is a droplet that exists and does not work yet.
      ready: false,
      actionId,
      passwordEmailed: !sshKeys,
    };
  },
};

export default action;
