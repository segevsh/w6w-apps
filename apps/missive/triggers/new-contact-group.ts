import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import contactGroupList from "../actions/contact-group-list.ts";

const PAGE_SIZE = 200;
const CAP = 5000;

/**
 * Contact groups have offset pagination but no documented chronological order. Poll a complete,
 * bounded snapshot for the selected contact book instead of treating the first page as newest.
 */
const trigger: TriggerDefinition = {
  key: "new-contact-group",
  title: "New Contact Group",
  description: "The run gets each new group in the selected contact book.",
  params: [
    { key: "contactBook", label: "Contact Book ID", type: "string", required: true },
    {
      key: "kind",
      label: "Kind",
      type: "select",
      required: true,
      options: [
        { value: "group", label: "Group" },
        { value: "organization", label: "Organization" },
      ],
    },
  ],
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Contact Group ID" },
    { key: "values", type: "object", label: "Current contact group" },
  ],
  sample: {
    change: "added",
    key: "contact-group-new",
    values: { id: "contact-group-new", name: "Customers" },
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const input = params as { contactBook: string; kind: "group" | "organization" };
    const rows: Array<{ key: string; values: unknown }> = [];
    for (let offset = 0;; offset += PAGE_SIZE) {
      const groups = await contactGroupList.execute({
        contactBook: input.contactBook,
        kind: input.kind,
        limit: PAGE_SIZE,
        offset,
      }, ctx) as unknown[];
      rows.push(...groups.map((group) => ({
        key: String((group as { id?: unknown }).id ?? ""),
        values: group,
      })));
      if (rows.length > CAP) {
        throw new Error(
          `Contact group snapshot exceeds the ${CAP}-row cap; narrow the contact book`,
        );
      }
      if (groups.length < PAGE_SIZE) break;
    }
    return await pollSnapshot({
      state,
      rows,
      emit: { added: true, updated: false, removed: false },
      maxRows: CAP,
    });
  },
};

export default trigger;
