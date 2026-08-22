import type { ActionDefinition } from "@w6w/types";
import { assertCredential, spaceIdOf, StoryblokClient } from "../lib/client.ts";

/**
 * `GET /v1/spaces/{id}/components` — the schemas every story is built from.
 *
 * ## This is what `story-create` has to satisfy
 *
 * A component defines the fields a block has and their types. Writing content
 * without reading it means guessing field names, and Storyblok accepts unknown
 * fields silently — they are stored, never rendered, and never seen again.
 * That is the failure mode this action exists to prevent: content that imports
 * cleanly and displays nothing.
 *
 * ## Content types and nestable blocks are different things
 *
 * `is_root` marks a component that can be a story's own type — a page, an
 * article. Everything else is a block that lives inside one. Creating a story
 * whose root component is not `is_root` produces a story the editor cannot
 * open properly.
 *
 * ## Required fields are a convention, not a constraint
 *
 * Storyblok marks fields required for the editor's benefit and does not
 * enforce them on the API. A story created through this app with a required
 * field missing saves, publishes, and renders as a gap.
 */
const action: ActionDefinition = {
  key: "component-list",
  type: "read",
  resource: "component",
  title: "List components",
  description:
    "The schemas stories are built from — what `story-create` has to satisfy. Storyblok stores " +
    "UNKNOWN FIELDS silently rather than rejecting them, so content can import cleanly and " +
    "render nothing. Separates content types from nestable blocks.",
  params: [
    {
      key: "nameContains",
      label: "Name contains",
      type: "string",
      default: "",
    },
    {
      key: "rootOnly",
      label: "Content types only",
      type: "boolean",
      default: false,
      hint: "Components a story can be, rather than blocks that live inside one.",
    },
  ],
  output: [
    { key: "components", type: "array", label: "The components" },
    { key: "count", type: "number", label: "How many" },
    { key: "names", type: "array", label: "Just the names" },
    { key: "contentTypes", type: "array", label: "Components a story's root may be" },
    { key: "nestable", type: "array", label: "Blocks that live inside another component" },
    { key: "fieldsByComponent", type: "object", label: "Component to its field names" },
    { key: "requiredFields", type: "object", label: "Marked required — not enforced by the API" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    assertCredential(ctx.connection, "management");
    const spaceId = spaceIdOf(ctx.connection);
    if (!spaceId) throw new Error("this connection records no space id — reconnect to set one");

    const result = await new StoryblokClient(ctx).management<{
      components?: Array<{
        id?: number;
        name?: string;
        display_name?: string;
        is_root?: boolean;
        is_nestable?: boolean;
        schema?: Record<string, { type?: string; required?: boolean }>;
      }>;
    }>(`/spaces/${encodeURIComponent(spaceId)}/components`);

    const all = result?.components ?? [];
    const needle = String(p.nameContains ?? "").trim().toLowerCase();
    let components = needle
      ? all.filter((component) => String(component?.name ?? "").toLowerCase().includes(needle))
      : all;
    if (p.rootOnly === true) components = components.filter((c) => c?.is_root === true);

    const fieldsByComponent: Record<string, string[]> = {};
    const requiredFields: Record<string, string[]> = {};
    for (const component of components) {
      const name = String(component?.name ?? "");
      if (!name) continue;
      const schema = component?.schema ?? {};
      fieldsByComponent[name] = Object.keys(schema);
      // Marked for the editor; the API accepts a story without them.
      const required = Object.entries(schema)
        .filter(([, field]) => field?.required === true)
        .map(([field]) => field);
      if (required.length) requiredFields[name] = required;
    }

    return {
      components: components.map((component) => ({
        id: component?.id,
        name: component?.name,
        displayName: component?.display_name,
        isRoot: component?.is_root === true,
        isNestable: component?.is_nestable === true,
        fieldCount: Object.keys(component?.schema ?? {}).length,
      })),
      count: components.length,
      names: components.map((component) => component?.name).filter(Boolean),
      contentTypes: components
        .filter((component) => component?.is_root === true)
        .map((component) => component?.name)
        .filter(Boolean),
      nestable: components
        .filter((component) => component?.is_root !== true)
        .map((component) => component?.name)
        .filter(Boolean),
      fieldsByComponent,
      requiredFields,
    };
  },
};

export default action;
