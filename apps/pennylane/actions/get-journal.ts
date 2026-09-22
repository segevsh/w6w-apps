import type { ActionDefinition } from "@w6w/types";
import { PennylaneClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `GET /journals/{id}` — one journal.
 *
 * A journal is four fields: `id`, `code` (the accounting code a ledger entry
 * carries — `VE`, `AC`, …), `label` and `type`. Ledger entries and bank
 * transactions reference it by id.
 */
interface Input {
  id: string;
}

const getJournal: ActionDefinition<Input> = {
  key: "get-journal",
  type: "read",
  resource: "journal",
  title: "Get Journal",
  description: "Fetch one accounting journal by id (GET /journals/{id}).",
  params: [idParam("Journal")],
  output: [
    { key: "id", type: "number", label: "Journal ID" },
    { key: "code", type: "string", label: "Journal code" },
    { key: "label", type: "string", label: "Label" },
    { key: "type", type: "string", label: "Type" },
  ],

  execute(input, ctx) {
    return new PennylaneClient(ctx).request(`/journals/${input.id}`);
  },
};

export default getJournal;
