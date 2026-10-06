import type { ActionDefinition, OutputField, Param } from "@w6w/types";
import { ActionNetworkClient, need, seg, strList } from "./client.ts";
import { getAction, idParam, type Input, listAction } from "./factory.ts";

/**
 * One writable field of a top-level resource (petition, event, form, ...). `key` is the camelCase
 * form field, `api` the vendor's snake_case name; `into` nests it under a sub-object (event
 * `location`).
 */
export interface Field {
  key: string;
  api: string;
  param: Omit<Param, "key">;
  into?: string;
  build?: (value: unknown) => unknown;
  /** `required` on create, `optional` on create, or not accepted on create. Default optional. */
  create?: "required" | "optional" | "none";
  /** Accepted on update (PUT). Default true. */
  update?: boolean;
}

export interface PageResource {
  /** kebab-case action prefix: `petition` -> `petition-list`, `petition-get`, ... */
  slug: string;
  /** Singular title: `Petition`. */
  label: string;
  /** Plural title: `Petitions`. */
  plural: string;
  /** Collection path: `/petitions`. */
  path: string;
  /** Input key of the resource's own id: `petitionId`. */
  idKey: string;
  fields: Field[];
  /** OData fields the vendor documents for this collection; omit when it documents none. */
  filterFields?: string;
  output: OutputField[];
  /** Extra sentence for the create action's description. */
  createNote?: string;
}

const str = (label: string, hint?: string): Omit<Param, "key"> => ({
  label,
  type: "string",
  ...(hint ? { hint } : {}),
});

export const ORIGIN_FIELD: Field = {
  key: "originSystem",
  api: "origin_system",
  create: "required",
  update: false,
  param: str(
    "Origin system",
    "Human-readable source of the record, e.g. MyApp.com. Shown in Action Network's targeting screens.",
  ),
};

export const TITLE_FIELD: Field = {
  key: "title",
  api: "title",
  create: "required",
  param: str("Public title"),
};

export const NAME_FIELD: Field = {
  key: "name",
  api: "name",
  param: str("Administrative name", "Shown only inside Action Network."),
};

export const DESCRIPTION_FIELD: Field = {
  key: "description",
  api: "description",
  param: { label: "Description", type: "text", hint: "May contain HTML." },
};

export const TAG_LIST_FIELD: Field = {
  key: "tagList",
  api: "tag_list",
  build: strList,
  param: {
    label: "Tags",
    type: "array",
    item: { type: "string" },
    hint:
      "Tag names. They must already exist; people who act through Action Network's own pages get them. Actions recorded through this API do not (add tags in the record helper instead).",
  },
};

export const BROWSER_URL_FIELD: Field = {
  key: "browserUrl",
  api: "browser_url",
  param: str("Page URL", "Where the action lives, on Action Network or a third-party site."),
};

/** The fields every page-like resource shares. */
export const COMMON_FIELDS: Field[] = [
  ORIGIN_FIELD,
  TITLE_FIELD,
  NAME_FIELD,
  DESCRIPTION_FIELD,
  BROWSER_URL_FIELD,
  TAG_LIST_FIELD,
];

/** Output fields every page-like resource carries. */
export const COMMON_OUTPUT: OutputField[] = [
  { key: "id", type: "string", label: "Action Network id (UUID)" },
  { key: "identifiers", type: "array", label: "All identifiers, `system:id`" },
  { key: "origin_system", type: "string", label: "Origin system" },
  { key: "title", type: "string", label: "Public title" },
  { key: "name", type: "string", label: "Administrative name" },
  { key: "description", type: "string", label: "Description (HTML)" },
  { key: "browser_url", type: "string", label: "Page URL" },
  { key: "tag_list", type: "array", label: "Tag names" },
  { key: "created_date", type: "string", label: "Created (ISO 8601)" },
  { key: "modified_date", type: "string", label: "Last modified (ISO 8601)" },
];

/** Body for POST (`create`) or PUT (`update`) from the form input. Unset fields are never sent. */
export function pageBody(
  res: Pick<PageResource, "fields">,
  input: Input,
  mode: "create" | "update",
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const f of res.fields) {
    if (mode === "update" && f.update === false) continue;
    if (mode === "create" && f.create === "none") continue;
    let value = input[f.key];
    if (value === undefined || value === null || value === "") continue;
    if (f.build) value = f.build(value);
    if (value === undefined) continue;
    if (f.into) {
      const nested = (body[f.into] ?? {}) as Record<string, unknown>;
      nested[f.api] = value;
      body[f.into] = nested;
    } else {
      body[f.api] = value;
    }
  }
  return body;
}

export function fieldParam(f: Field, mode: "create" | "update"): Param {
  const required = mode === "create" && f.create === "required";
  return { key: f.key, ...f.param, ...(required ? { required: true } : {}) };
}

export function pageList(res: PageResource): ActionDefinition<Input> {
  return listAction({
    key: `${res.slug}-list`,
    resource: res.slug,
    title: `List ${res.plural}`,
    description:
      `List ${res.plural.toLowerCase()} visible to the API key, 25 per page, with an optional OData filter.`,
    path: () => res.path,
    filterFields: res.filterFields,
  });
}

export function pageGet(res: PageResource): ActionDefinition<Input> {
  return getAction({
    key: `${res.slug}-get`,
    resource: res.slug,
    title: `Get ${res.label}`,
    description: `Fetch one ${res.label.toLowerCase()} by its Action Network id.`,
    params: [idParam(res.idKey, `${res.label} ID`, "The UUID, with or without `action_network:`.")],
    path: (i) => `${res.path}/${seg(need(i, res.idKey))}`,
    output: res.output,
  });
}

export function pageCreate(res: PageResource): ActionDefinition<Input> {
  return {
    key: `${res.slug}-create`,
    type: "perform",
    resource: res.slug,
    title: `Create ${res.label}`,
    description: `Create a ${res.label.toLowerCase()} through the API.${
      res.createNote ? ` ${res.createNote}` : ""
    }`,
    idempotent: false,
    params: res.fields.filter((f) => f.create !== "none").map((f) => fieldParam(f, "create")),
    output: res.output,
    async execute(input, ctx) {
      for (const f of res.fields) if (f.create === "required") need(input, f.key);
      const body = pageBody(res, input, "create");
      return await new ActionNetworkClient(ctx).create(res.path, body);
    },
  };
}

export function pageUpdate(res: PageResource): ActionDefinition<Input> {
  return {
    key: `${res.slug}-update`,
    type: "perform",
    resource: res.slug,
    title: `Update ${res.label}`,
    description:
      `Change fields on a ${res.label.toLowerCase()}. Only the fields you set are sent; nothing is removed unless you clear it.`,
    idempotent: true,
    params: [
      idParam(res.idKey, `${res.label} ID`),
      ...res.fields.filter((f) => f.update !== false).map((f) => fieldParam(f, "update")),
    ],
    output: res.output,
    execute(input, ctx) {
      const body = pageBody(res, input, "update");
      if (Object.keys(body).length === 0) throw new Error("set at least one field to change");
      return new ActionNetworkClient(ctx).update(
        `${res.path}/${seg(need(input, res.idKey))}`,
        body,
      );
    },
  };
}
