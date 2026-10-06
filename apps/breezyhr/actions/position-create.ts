import type { ActionDefinition } from "@w6w/types";
import {
  BreezyClient,
  compact,
  compactOrUndefined,
  company,
  jsonValue,
  strList,
} from "../lib/client.ts";
import { companyIdParam, POSITION_OUTPUT } from "../lib/params.ts";

interface Input {
  companyId: string;
  name: string;
  description: string;
  type: string;
  country: string;
  state?: string;
  city?: string;
  isRemote?: boolean;
  requisitionId?: string;
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
  applicationForm?: unknown;
}

/**
 * `POST /company/{id}/positions`. Required: `name`, `description`, `type`, `location.country`.
 * Fields outside the documented schema are dropped by Breezy, and the new position starts as a
 * draft; publish it with Set Position State.
 */
const positionCreate: ActionDefinition<Input> = {
  key: "position-create",
  type: "perform",
  resource: "position",
  title: "Create Position",
  description:
    "Create a position (job requisition). It starts unpublished; use Set Position State to publish it.",
  idempotent: false,
  params: [
    companyIdParam,
    { key: "name", label: "Title", type: "string", required: true },
    {
      key: "description",
      label: "Description",
      type: "text",
      required: true,
      hint: "HTML or text.",
    },
    {
      key: "type",
      label: "Employment type",
      type: "select",
      required: true,
      default: "fullTime",
      options: [
        { value: "fullTime", label: "Full time" },
        { value: "partTime", label: "Part time" },
        { value: "contract", label: "Contract" },
        { value: "temporary", label: "Temporary" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "country",
      label: "Country",
      type: "string",
      required: true,
      hint: "Country code, e.g. US. For US and CA the state is validated.",
    },
    { key: "state", label: "State / province", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "isRemote", label: "Remote", type: "boolean" },
    { key: "requisitionId", label: "Requisition ID", type: "string" },
    {
      key: "department",
      label: "Department",
      type: "string",
      hint: "A department name from List Departments.",
    },
    {
      key: "category",
      label: "Category",
      type: "string",
      hint: "A category id from List Position Categories.",
    },
    {
      key: "experience",
      label: "Experience",
      type: "select",
      options: [
        { value: "na", label: "Not applicable" },
        { value: "internship", label: "Internship" },
        { value: "entry-level", label: "Entry level" },
        { value: "associate", label: "Associate" },
        { value: "mid-level", label: "Mid level" },
        { value: "senior-level", label: "Senior level" },
        { value: "executive", label: "Executive" },
      ],
    },
    {
      key: "education",
      label: "Education",
      type: "select",
      options: [
        { value: "unspecified", label: "Unspecified" },
        { value: "high-school", label: "High school" },
        { value: "certification", label: "Certification" },
        { value: "vocational", label: "Vocational" },
        { value: "associate-degree", label: "Associate degree" },
        { value: "bachelors-degree", label: "Bachelor's degree" },
        { value: "masters-degree", label: "Master's degree" },
        { value: "doctorate", label: "Doctorate" },
        { value: "professional", label: "Professional" },
        { value: "some-college", label: "Some college" },
        { value: "vocational-diploma", label: "Vocational diploma" },
        { value: "vocational-degree", label: "Vocational degree" },
        { value: "some-high-school", label: "Some high school" },
      ],
    },
    { key: "salaryFrom", label: "Salary from", type: "number" },
    { key: "salaryTo", label: "Salary to", type: "number" },
    {
      key: "salaryPeriod",
      label: "Salary period",
      type: "string",
      hint:
        "Hourly, Daily, Weekly, Biweekly, Monthly, Yearly, or a company-defined term. Case-insensitive.",
    },
    {
      key: "salaryCurrency",
      label: "Salary currency",
      type: "string",
      hint: "A currency code, e.g. USD.",
    },
    {
      key: "pipelineId",
      label: "Pipeline ID",
      type: "string",
      hint: "Must exist, or Breezy answers 404.",
    },
    { key: "scorecardId", label: "Scorecard ID", type: "string" },
    { key: "questionnaireId", label: "Questionnaire ID", type: "string" },
    { key: "tags", label: "Tags", type: "array", item: { type: "string" } },
    {
      key: "applicationForm",
      label: "Application form",
      type: "json",
      hint:
        'Per-field visibility, e.g. {"resume":"required","cover_letter":"hidden"}; each value is required, optional or hidden.',
    },
  ],
  output: POSITION_OUTPUT,

  execute(input, ctx) {
    return new BreezyClient(ctx).request("POST", `${company(input.companyId)}/positions`, {
      body: compact({
        name: input.name,
        description: input.description,
        type: input.type,
        location: compact({
          country: input.country,
          state: input.state || undefined,
          city: input.city || undefined,
          is_remote: input.isRemote,
        }),
        requisition_id: input.requisitionId || undefined,
        department: input.department || undefined,
        category: input.category || undefined,
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
        tags: strList(input.tags),
        application_form: jsonValue(input.applicationForm),
      }),
    });
  },
};

export default positionCreate;
