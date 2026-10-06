import type { ActionDefinition } from "@w6w/types";
import { encodeId, HibobClient } from "../lib/client.ts";
import { employeeIdParam, toStringList } from "../lib/params.ts";

interface Input {
  employeeId: string;
  fields?: unknown;
  humanReadable?: string;
}

/**
 * `POST /v1/people/{identifier}` — read one employee's fields by id. A POST, like
 * search, because the body selects `fields`. Same silent omission rule: fields the
 * service user cannot view are absent from a 200.
 */
const personGet: ActionDefinition<Input> = {
  key: "person-get",
  type: "read",
  resource: "employee",
  title: "Read Employee",
  description: "Read the fields of one employee by Bob employee id.",
  params: [
    employeeIdParam,
    {
      key: "fields",
      label: "Fields",
      type: "json",
      hint:
        'Field ids in dot notation, e.g. ["root.email", "work.title"]. Omit for the default set.',
    },
    {
      key: "humanReadable",
      label: "Human-readable values",
      type: "select",
      options: [
        { value: "", label: "Machine values only" },
        { value: "APPEND", label: "Append humanReadable node" },
        { value: "REPLACE", label: "Replace with human-readable values" },
      ],
    },
  ],
  output: [{ key: "employees", type: "object", label: "Employee records (one entry)" }],

  async execute(input, ctx) {
    const fields = toStringList(input.fields);
    const body: Record<string, unknown> = {};
    if (fields.length) body.fields = fields;
    if (input.humanReadable) body.humanReadable = input.humanReadable;
    return await new HibobClient(ctx).post(`/people/${encodeId(input.employeeId)}`, body);
  },
};

export default personGet;
