import type { TriggerDefinition } from "@w6w/types";
import { pollNewItems } from "../../_shared/poll/mod.ts";
import pipelineList from "../actions/pipeline-list.ts";

/** CircleCI answers 20 pipelines per page; 10 pages is the most one check will walk. */
export const MAX_PAGES = 10;

interface Params {
  projectSlug?: string;
  branch?: string;
}

interface Pipeline {
  id?: string;
  created_at?: string;
}

/**
 * Order-independent: CircleCI states no order for this list ("Returns all pipelines for this
 * project", https://circleci.com/docs/api/v2/openapi.json), so a check walks `next_page_token` up
 * to `MAX_PAGES` pages, sorts what it found by `created_at`, and de-duplicates on the pipeline id.
 */
const trigger: TriggerDefinition<Params> = {
  key: "new-pipeline",
  title: "New Pipeline",
  description: "The run gets each newly created project pipeline.",
  params: pipelineList.params?.filter((p) => p.key !== "pageToken"),
  output: [
    { key: "id", type: "string", label: "Pipeline ID" },
    { key: "number", type: "number", label: "Pipeline number" },
    { key: "project_slug", type: "string", label: "Project slug" },
    { key: "state", type: "string", label: "State" },
    { key: "created_at", type: "string", label: "Created at" },
  ],
  sample: {
    id: "4b6f1d2e-1a11-4a37-b0ea-0c2cc018d3f9",
    number: 412,
    project_slug: "gh/acme/web",
    state: "created",
    created_at: "2026-11-09T09:00:00.000Z",
  },
  minIntervalMs: 300_000,
  async poll({ params, state }, ctx) {
    const { events, nextState } = await pollNewItems<Pipeline>({
      state,
      maxPages: 1,
      maxEvents: 200,
      seenWindow: 600,
      idOf: (p) => String(p.id),
      async fetchPage() {
        const all: Pipeline[] = [];
        let token: string | undefined;
        for (let page = 0; page < MAX_PAGES; page++) {
          const res = await pipelineList.execute({
            projectSlug: params.projectSlug,
            branch: params.branch,
            pageToken: token,
          }, ctx) as { items?: Pipeline[]; next_page_token?: string | null };
          all.push(...(res.items ?? []));
          token = res.next_page_token || undefined;
          if (!token) return { items: sortNewestFirst(all) };
        }
        ctx.log(
          "warn",
          `new-pipeline: more than ${MAX_PAGES} pages of pipelines; the rest are skipped`,
        );
        return { items: sortNewestFirst(all) };
      },
    });
    return { events, nextState };
  },
};

function sortNewestFirst(items: Pipeline[]): Pipeline[] {
  return [...items].sort((a, b) =>
    String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
  );
}

export default trigger;
