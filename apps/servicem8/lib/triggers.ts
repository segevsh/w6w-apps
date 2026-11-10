import type { OutputField, TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import action from "../actions/category-list.ts";

interface Category {
  uuid: string;
  name?: string;
  active?: number;
  edit_date?: string;
}

const OUTPUT: OutputField[] = [
  { key: "uuid", type: "string", label: "Category ID" },
  { key: "name", type: "string", label: "Name" },
  { key: "active", type: "number", label: "Active (1) or archived (0)" },
  { key: "edit_date", type: "string", label: "Last edited" },
];

const SAMPLE: Category = {
  uuid: "123e4567-9843-4817-be2d-745085fb7177",
  name: "Plumbing",
  active: 1,
  edit_date: "2026-11-09 09:00:00",
};

/**
 * Job Categories are a small configuration list: the vendor returns up to 1,000 records per response
 * (`x-next-cursor` marks a further page), so one `GET /category.json?cursor=-1` is the whole
 * collection. A second page means the list is too large to snapshot, which is refused rather than
 * silently truncated.
 */
async function categories(ctx: Parameters<NonNullable<typeof action.execute>>[1]) {
  const page = await action.execute!({ cursor: "-1" }, ctx) as {
    items?: Category[];
    nextCursor?: string;
  };
  if (page.nextCursor) {
    throw new Error("ServiceM8 returned more than one page of categories; too many to snapshot");
  }
  return (page.items ?? []).map((c) => ({ key: String(c.uuid), values: c }));
}

export const newCategoryTrigger: TriggerDefinition = {
  key: "new-category",
  title: "New Category",
  description: "The run gets each job category newly added to the account.",
  output: OUTPUT,
  sample: SAMPLE,
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const { events, nextState } = await pollSnapshot({
      state,
      rows: await categories(ctx),
      emit: { added: true, updated: false },
    });
    return { events: events.map((e) => e.values as Category), nextState };
  },
};

export const newOrUpdatedCategoryTrigger: TriggerDefinition = {
  key: "new-or-updated-category",
  title: "New or Updated Category",
  description: "The run gets each job category that is added or edited, with what changed.",
  output: [{ key: "change", type: "string", label: "added or updated" }, ...OUTPUT],
  sample: { change: "updated", ...SAMPLE, name: "Plumbing and drainage" },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const { events, nextState } = await pollSnapshot({
      state,
      rows: await categories(ctx),
      emit: { added: true, updated: true },
    });
    return {
      events: events.map((e) => ({ change: e.change, ...(e.values as Category) })),
      nextState,
    };
  },
};
