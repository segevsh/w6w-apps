import type { ActionDefinition } from "@w6w/types";
import { AttioClient, PAGE_OUTPUT } from "../lib/client.ts";

/**
 * `GET /v2/objects` — every object in the workspace.
 *
 * "Lists all system-defined and user-defined objects in your workspace."
 *
 * The starting point for everything else in this app, because every record
 * action is parameterised by an object slug and this is where the slugs come
 * from. Attio ships two objects enabled by default — **people** and
 * **companies** — plus three optional ones: **deals**, **users** and
 * **workspaces**. Everything else is the workspace's own.
 *
 * Each result carries `api_slug` and a composite `id`. Either works wherever an
 * object is named. Which to use is a real choice, from the Slugs and IDs page:
 * "Slugs of system attributes and objects are consistent across time and across
 * workspaces. Non-system slugs are mutable, so care should be taken when
 * modifying them in case they break any integrations relying upon them. If you
 * would like to provide resilience against such changes, please use IDs when
 * looking up objects instead."
 *
 * So: slugs for `people` and `companies`, UUIDs for a custom object someone may
 * rename.
 *
 * Needs `object_configuration:read`. The endpoint takes no parameters.
 */
const listObjects: ActionDefinition<Record<string, never>> = {
  key: "list-objects",
  type: "read",
  resource: "object",
  title: "List Objects",
  description:
    "Every object in the workspace, system-defined and custom. Where the `api_slug` and UUID " +
    "that every record action needs come from. Use slugs for standard objects (stable forever) " +
    "and UUIDs for custom ones (slugs are mutable).",
  params: [],
  output: PAGE_OUTPUT,

  async execute(_input, ctx) {
    const { records } = await new AttioClient(ctx).list("/objects");
    return { records };
  },
};

export default listObjects;
