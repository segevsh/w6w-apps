import type { ActionDefinition } from "@w6w/types";
import { csv, NocoDBClient } from "../lib/client.ts";

/**
 * `POST` and `DELETE` on
 * `/api/v2/tables/{tableId}/links/{linkFieldId}/records/{recordId}` — connect
 * records, or disconnect them.
 *
 * ## Linking is not writing a field
 *
 * A link cannot be set through `record-update`: sending a linked-record column
 * in a record payload does not create the relationship. It has its own
 * endpoint, and this is it — which is the second half of the surprise in
 * `link-list`, where the relationship is also absent from the record.
 *
 * ## Adding is additive, and removing is precise
 *
 * `POST` adds the ids to whatever is already linked; it does not replace the
 * set. So there is no way to *set* the links to exactly a list in one call —
 * `mode: replace` here reads the current links, removes what is not wanted and
 * adds what is missing, which is three requests against a sixty-a-minute
 * budget and worth choosing deliberately.
 *
 * ## A one-to-many link enforces itself
 *
 * On a many-to-one side, linking a second record replaces the first rather
 * than adding to it — the relationship's cardinality wins, quietly. On a
 * many-to-many both accumulate.
 */
const action: ActionDefinition = {
  key: "link-set",
  type: "perform",
  resource: "link",
  title: "Link or unlink records",
  description:
    "Connect records across tables, which `record-update` CANNOT do — links have their own " +
    "endpoint. Adding is additive; `replace` reads first and reconciles, costing three requests " +
    "against a budget of 60 a minute.",
  idempotent: true,
  params: [
    { key: "tableId", label: "Table ID", type: "string", required: true, default: "" },
    {
      key: "linkFieldId",
      label: "Link field ID",
      type: "string",
      required: true,
      default: "",
      hint: "The field's ID, from `table-get`.",
    },
    { key: "recordId", label: "Record ID", type: "string", required: true, default: "" },
    {
      key: "linkedIds",
      label: "Linked record IDs",
      type: "string",
      required: true,
      default: "",
      placeholder: "12, 13",
      hint: "Primary keys in the LINKED table.",
    },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      default: "add",
      options: [
        { value: "add", label: "Add — link these, keep the rest" },
        { value: "remove", label: "Remove — unlink these, keep the rest" },
        { value: "replace", label: "Replace — make the links exactly these" },
      ],
      hint: "NocoDB itself only adds and removes; `replace` reads the current links first.",
    },
  ],
  output: [
    { key: "recordId", type: "string", label: "Which record" },
    { key: "linked", type: "array", label: "What it is linked to now, for a replace" },
    { key: "added", type: "array", label: "Newly linked" },
    { key: "removed", type: "array", label: "Unlinked" },
    { key: "changed", type: "boolean", label: "Whether anything changed" },
    { key: "requests", type: "number", label: "How much of the rate limit this cost" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const tableId = String(p.tableId ?? "").trim();
    if (!tableId) throw new Error("`tableId` is required");
    const linkFieldId = String(p.linkFieldId ?? "").trim();
    if (!linkFieldId) throw new Error("`linkFieldId` is required — the field's ID, not its name");
    const recordId = String(p.recordId ?? "").trim();
    if (!recordId) throw new Error("`recordId` is required");

    const wanted = csv(p.linkedIds) ?? [];
    if (!wanted.length) throw new Error("`linkedIds` must name at least one record");

    const client = new NocoDBClient(ctx);
    const path = `/api/v2/tables/${encodeURIComponent(tableId)}/links/${
      encodeURIComponent(linkFieldId)
    }/records/${encodeURIComponent(recordId)}`;
    const body = (ids: string[]) => ids.map((id) => ({ Id: id }));

    const mode = String(p.mode ?? "add");
    let added: string[] = [];
    let removed: string[] = [];
    let requests = 0;

    if (mode === "replace") {
      // NocoDB has no replace, so this is read, remove, add.
      const current = await client.request<{ list?: Array<Record<string, unknown>> }>(path, {
        query: { limit: 1000 },
      });
      requests += 1;
      const existing = (current?.list ?? [])
        .map((record) => String(record?.Id ?? record?.id ?? ""))
        .filter(Boolean);

      removed = existing.filter((id) => !wanted.includes(id));
      added = wanted.filter((id) => !existing.includes(id));
      if (removed.length) {
        await client.request(path, { method: "DELETE", body: body(removed) });
        requests += 1;
      }
      if (added.length) {
        await client.request(path, { method: "POST", body: body(added) });
        requests += 1;
      }
    } else if (mode === "remove") {
      await client.request(path, { method: "DELETE", body: body(wanted) });
      requests += 1;
      removed = wanted;
    } else {
      await client.request(path, { method: "POST", body: body(wanted) });
      requests += 1;
      added = wanted;
      ctx.log(
        "info",
        "links were added to whatever was already there. On a many-to-one relationship NocoDB " +
          "replaces rather than accumulating — the cardinality wins, quietly",
        { recordId },
      );
    }

    return {
      recordId,
      linked: mode === "replace" ? wanted : undefined,
      added,
      removed,
      changed: added.length > 0 || removed.length > 0,
      requests,
    };
  },
};

export default action;
