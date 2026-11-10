import type { TriggerDefinition } from "@w6w/types";
import { pollSnapshot } from "../../_shared/poll/mod.ts";
import surveyList from "../actions/survey-list.ts";

const trigger: TriggerDefinition = {
  key: "new-survey",
  title: "New Survey",
  description: "The run gets each survey newly available in the workspace.",
  output: [
    { key: "change", type: "string", label: "Change" },
    { key: "key", type: "string", label: "Survey ID" },
    { key: "values", type: "object", label: "Survey" },
  ],
  sample: {
    change: "added",
    key: "clsurvey123",
    values: { id: "clsurvey123", name: "Customer feedback" },
  },
  minIntervalMs: 300_000,
  async poll({ state }, ctx) {
    const result = await surveyList.execute({}, ctx) as {
      data?: Array<{ id?: string; [key: string]: unknown }>;
    };
    return await pollSnapshot({
      state,
      rows: (result.data ?? []).flatMap((survey) =>
        survey.id ? [{ key: survey.id, values: survey }] : []
      ),
      emit: { added: true, updated: false },
      maxRows: 5000,
    });
  },
};

export default trigger;
