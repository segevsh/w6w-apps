import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, compact, compactOrUndefined, position, strList } from "../lib/client.ts";
import { companyIdParam, POSITION_OUTPUT, positionIdParam } from "../lib/params.ts";

interface Input {
  companyId: string;
  positionId: string;
  name?: string;
  description?: string;
  type?: string;
  department?: string;
  category?: string;
  experience?: string;
  education?: string;
  salaryFrom?: number;
  salaryTo?: number;
  salaryPeriod?: string;
  salaryCurrency?: string;
  pipelineId?: string;
  scorecardId?: string;
  questionnaireId?: string;
  tags?: string[] | string;
}

/**
 * `PUT /company/{id}/position/{id}` — a partial update: only the fields sent change, and any
 * field Breezy does not list as editable is silently dropped. The update schema has no
 * `location`, so location cannot be changed here.
 */
const positionUpdate: ActionDefinition<Input> = {
  key: "position-update",
  type: "perform",
  resource: "position",
  title: "Update Position",
  description:
    "Change a position's title, description, type, department, category, salary, pipeline or tags. Only the fields you set change.",
  idempotent: true,
  params: [
    companyIdParam,
    positionIdParam,
    { key: "name", label: "Title", type: "string" },
    { key: "description", label: "Description", type: "text" },
    {
      key: "type",
      label: "Employment type",
      type: "select",
      options: [
        { value: "fullTime", label: "Full time" },
        { value: "partTime", label: "Part time" },
        { value: "contract", label: "Contract" },
        { value: "temporary", label: "Temporary" },
        { value: "other", label: "Other" },
      ],
    },
    { key: "department", label: "Department", type: "string" },
    { key: "category", label: "Category", type: "string" },
    {
      key: "experience",
      label: "Experience",
      type: "string",
      hint: "na, internship, entry-level, associate, mid-level, senior-level or executive.",
    },
    { key: "education", label: "Education", type: "string", hint: "e.g. bachelors-degree." },
    { key: "salaryFrom", label: "Salary from", type: "number" },
    { key: "salaryTo", label: "Salary to", type: "number" },
    { key: "salaryPeriod", label: "Salary period", type: "string" },
    { key: "salaryCurrency", label: "Salary currency", type: "string" },
    { key: "pipelineId", label: "Pipeline ID", type: "string" },
    { key: "scorecardId", label: "Scorecard ID", type: "string" },
    { key: "questionnaireId", label: "Questionnaire ID", type: "string" },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string" },
      hint: "Replaces the position's tags.",
    },
  ],
  output: POSITION_OUTPUT,

  execute(input, ctx) {
    return new BreezyClient(ctx).request("PUT", position(input.companyId, input.positionId), {
      body: compact({
        name: input.name,
        description: input.description,
        type: input.type || undefined,
        department: input.department,
        category: input.category,
        experience: input.experience || undefined,
        education: input.education || undefined,
        salary: compactOrUndefined({
          from: input.salaryFrom,
          to: input.salaryTo,
          period: input.salaryPeriod || undefined,
          currency: input.salaryCurrency || undefined,
        }),
        pipeline_id: input.pipelineId || undefined,
        scorecard_id: input.scorecardId || undefined,
        questionnaire_id: input.questionnaireId || undefined,
        tags: input.tags === undefined ? undefined : (strList(input.tags) ?? []),
      }),
    });
  },
};

export default positionUpdate;
