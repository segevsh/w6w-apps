import type { ActionDefinition } from "@w6w/types";
import { BambooClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `GET /api/v1/employees/{id}/files/view` — list an employee's files by category.
 *
 * Note the `/view` suffix: the collection is `/files`, but listing it is
 * `/files/view`. `POST /files` is the upload. Dropping `/view` does not list.
 *
 * This endpoint is where the XML default is documented most explicitly in the
 * whole API, which is why `lib/client.ts` quotes it — its `Accept` parameter
 * carries `default: application/xml` and the note "Set to `application/json` to
 * receive a JSON response. **Any other value (or omitted) returns XML.**"
 * `BambooClient` sends `accept: application/json` on every request, so this
 * action needs no special handling; the guarantee is asserted centrally in
 * `tests/lib/client.test.ts` rather than restated per call site.
 *
 * The response groups files under categories rather than returning a flat list.
 */
const listEmployeeFiles: ActionDefinition<Input> = {
  key: "list-employee-files",
  type: "search",
  resource: "file",
  title: "List Employee Files",
  description:
    "List the files attached to an employee, grouped by file category. Returns metadata (id, " +
    "name, size, dates, sharing) — not file contents.",
  params: [
    {
      key: "id",
      label: "Employee ID",
      type: "string",
      required: true,
      hint: "The INTERNAL employee ID whose files should be listed.",
    },
  ],
  output: [{ key: "categories", type: "array", label: "File categories, each with its files" }],

  execute(input, ctx) {
    return new BambooClient(ctx).request(
      `/employees/${encodeURIComponent(input.id)}/files/view`,
    );
  },
};

export default listEmployeeFiles;
