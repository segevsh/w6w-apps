import type { OutputField, Param } from "@w6w/types";

/** Shared pieces of the Typeform list-backed poll triggers (forms, workspaces, themes, images). */

export const WORKSPACE_PARAM: Param = {
  key: "workspaceId",
  label: "Workspace ID",
  type: "string",
  hint: "Only forms in this workspace. Leave blank for every form in the account.",
};

/** `{ items: [...] }` → the items (the shape of GET /forms, /workspaces and /themes). */
export function itemsOf(result: unknown): unknown[] {
  const items = (result as { items?: unknown })?.items;
  return Array.isArray(items) ? items : [];
}

export const formItems = itemsOf;

/** A non-empty string id, or a loud failure (a silent skip would mean a lost event). */
export function idOf(item: unknown, what: string): string {
  const id = (item as { id?: unknown } | null)?.id;
  if (typeof id !== "string" || id === "") {
    throw new Error(`Typeform list returned a ${what} without an id`);
  }
  return id;
}

export const formId = (item: unknown) => idOf(item, "form");

/** `id:last_updated_at`, so an edited form is a new event. */
export function formVersionId(item: unknown): string {
  const stamp = (item as { last_updated_at?: unknown }).last_updated_at;
  return `${formId(item)}:${typeof stamp === "string" ? stamp : ""}`;
}

export const FORM_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Form ID" },
  { key: "title", type: "string", label: "Title" },
  { key: "created_at", type: "string", label: "Created At" },
  { key: "last_updated_at", type: "string", label: "Last Updated At" },
  { key: "settings", type: "object", label: "Settings" },
  { key: "_links", type: "object", label: "Links" },
];

export const FORM_SAMPLE = {
  id: "lT9Z2j",
  title: "Customer feedback",
  last_updated_at: "2026-11-10T09:30:00+00:00",
  created_at: "2026-11-01T12:00:00+00:00",
  settings: { is_public: true },
  _links: { display: "https://example.typeform.com/to/lT9Z2j" },
};
