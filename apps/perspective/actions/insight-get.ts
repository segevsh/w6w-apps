import type { ActionDefinition } from "@w6w/types";
import { encodeId, isoDate, PerspectiveClient, requireString } from "../lib/client.ts";
import { fromParam, funnelIdParam, offsetParam, toParam } from "../lib/params.ts";

/**
 * `GET /v1/funnels/{funnelId}/metrics/insights/{insightId}` — answer counts for
 * one question or survey element. The id is the element id shown in the funnel
 * builder (e.g. `question_1234`); there is no endpoint that lists them.
 */
interface Input {
  funnelId: string;
  insightId: string;
  from: string;
  to: string;
  offset?: string;
}

const insightGet: ActionDefinition<Input> = {
  key: "insight-get",
  type: "read",
  resource: "metric",
  title: "Get Insight",
  description: "Read how respondents answered one funnel question over a period.",
  params: [
    funnelIdParam,
    {
      key: "insightId",
      label: "Question ID",
      type: "string",
      required: true,
      placeholder: "question_1234",
      hint: "The question or survey element id as shown in the funnel builder.",
    },
    fromParam,
    toParam,
    offsetParam,
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "Insight",
    },
  ],

  async execute(input, ctx) {
    const funnelId = encodeId(requireString(input.funnelId, "funnelId"));
    const insightId = encodeId(requireString(input.insightId, "insightId"));
    const from = isoDate(input.from, "from");
    const to = isoDate(input.to, "to");
    if (from >= to) throw new Error("from must be before to");
    const data = await new PerspectiveClient(ctx).data(
      `/funnels/${funnelId}/metrics/insights/${insightId}`,
      { query: { from, to, offset: input.offset?.toString().trim() } },
    );
    return { data };
  },
};

export default insightGet;
