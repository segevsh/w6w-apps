import type { ActionDefinition } from "@w6w/types";
import { LeverClient } from "../lib/client.ts";

/**
 * `GET /v1/stages` — the pipeline this account uses.
 *
 * ## Stage ids are per account, and every write takes an id
 *
 * "Phone Screen" is a different UUID in every Lever account, and
 * `opportunity-stage-set` accepts only the id. So a workflow that hardcodes
 * one works in the account it was written against and nowhere else — and stops
 * working in that one the day somebody rebuilds the pipeline.
 *
 * Looking the stage up by name at run time is the version that survives, which
 * is what this action is for. It returns a name-to-id map for exactly that.
 *
 * ## Stage names are not unique, and Lever does not stop that
 *
 * Two stages can share a name. The map returned here keeps the first, and the
 * duplicates are reported separately rather than silently collapsed — because
 * a workflow resolving "Onsite" to the wrong one of two moves candidates into
 * a stage nobody is watching.
 */
const action: ActionDefinition = {
  key: "stage-list",
  type: "read",
  resource: "stage",
  title: "List stages",
  description:
    "The pipeline's stages with their IDS — which every write takes and which differ between " +
    "accounts, so resolving by name at run time is what survives a rebuild. Reports duplicate " +
    "names rather than collapsing them.",
  params: [],
  output: [
    { key: "stages", type: "array", label: "The stages, in pipeline order" },
    { key: "count", type: "number", label: "How many" },
    { key: "names", type: "array", label: "Just the names" },
    { key: "byName", type: "object", label: "Name to id, for resolving at run time" },
    { key: "duplicateNames", type: "array", label: "Names that map to more than one stage" },
    { key: "firstStageId", type: "string", label: "Where new candidates usually land" },
  ],

  async execute(_input, ctx) {
    const page = await new LeverClient(ctx).list<{ id?: string; text?: string }>("/stages", {
      query: { limit: 100 },
    });

    const stages = page.data;
    const byName: Record<string, string> = {};
    const seen = new Set<string>();
    const duplicateNames: string[] = [];
    for (const stage of stages) {
      const name = String(stage?.text ?? "");
      if (!name || !stage?.id) continue;
      if (seen.has(name)) {
        if (!duplicateNames.includes(name)) duplicateNames.push(name);
        continue;
      }
      seen.add(name);
      byName[name] = stage.id;
    }

    if (duplicateNames.length) {
      ctx.log(
        "warn",
        "some stage names appear more than once, so resolving by name is ambiguous — a workflow " +
          "picking the wrong one moves candidates into a stage nobody is watching",
        { duplicateNames },
      );
    }

    return {
      stages: stages.map((stage) => ({ id: stage?.id, name: stage?.text })),
      count: stages.length,
      names: stages.map((stage) => stage?.text).filter(Boolean),
      byName,
      duplicateNames,
      firstStageId: stages[0]?.id,
    };
  },
};

export default action;
