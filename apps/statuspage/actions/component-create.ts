import type { ActionDefinition } from "@w6w/types";
import { compact, COMPONENT_STATUSES, StatuspageClient } from "../lib/client.ts";
import { PAGE_PARAM } from "../lib/params.ts";

/**
 * `POST /pages/{page}/components` — add something to the page.
 *
 * Useful when the thing being monitored is created by the same automation that
 * monitors it — a new region, a new tenant-facing service — so the status page
 * grows with the estate instead of drifting behind it.
 *
 * Two flags decide how visible it is. **`showcase`** puts it on the public page;
 * without it the component exists, can be set to `major_outage`, and nobody
 * sees anything. **`only_show_if_degraded`** hides it until it breaks, which
 * keeps a long tail of subsystems off the page while still letting them raise
 * an alarm.
 *
 * Names are not unique, so running this twice creates two components with the
 * same name — which is why it is not idempotent and why a provisioning workflow
 * should read `component-list` first.
 */
const action: ActionDefinition = {
  key: "component-create",
  type: "perform",
  resource: "component",
  title: "Create component",
  description:
    "Add a component to the page. Names are not unique, so re-running creates a duplicate — and " +
    "without `showcase` it is invisible to customers however red it goes.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
    },
    {
      key: "description",
      label: "Description",
      type: "string",
      default: "",
    },
    {
      key: "status",
      label: "Initial Status",
      type: "select",
      default: "operational",
      options: COMPONENT_STATUSES,
    },
    {
      key: "groupId",
      label: "Component Group ID",
      type: "string",
      default: "",
      hint: "Put it inside an existing group. `component-group-list` has the ids.",
    },
    {
      key: "showcase",
      label: "Show On Public Page",
      type: "boolean",
      default: true,
      hint: "Off, the component exists but customers never see it — including when it is down.",
    },
    {
      key: "onlyShowIfDegraded",
      label: "Only Show If Degraded",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Hidden until it breaks — how to keep a long tail of subsystems off the page while " +
        "still letting them raise an alarm.",
    },
    PAGE_PARAM,
  ],
  output: [
    { key: "id", type: "string", label: "Component ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "group_id", type: "string", label: "Group" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");

    const client = new StatuspageClient(ctx);
    const pageId = client.pageFor(p.pageId);
    return await client.request(`/pages/${encodeURIComponent(pageId)}/components`, {
      method: "POST",
      body: {
        component: compact({
          name,
          description: p.description,
          status: String(p.status ?? "operational"),
          group_id: p.groupId,
          showcase: p.showcase !== false,
          only_show_if_degraded: p.onlyShowIfDegraded === true ? true : undefined,
        }),
      },
    });
  },
};

export default action;
