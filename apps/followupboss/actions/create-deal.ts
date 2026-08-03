import type { ActionDefinition } from "@w6w/types";
import { CUSTOM_FIELDS_PARAM, FubClient, withCustomFields } from "../lib/client.ts";

interface Input {
  name: string;
  stageId: number;
  description?: string;
  peopleIds?: number[];
  userIds?: number[];
  price?: number;
  projectedCloseDate?: string;
  orderWeight?: number;
  commissionValue?: number;
  agentCommission?: number;
  teamCommission?: number;
  earnestMoneyDueDate?: string;
  mutualAcceptanceDate?: string;
  dueDiligenceDate?: string;
  finalWalkThroughDate?: string;
  possessionDate?: string;
  customFields?: unknown;
}

/**
 * `POST /deals` — create a transaction.
 *
 * `name` and `stageId` are the schema's two required fields. Note it is
 * `stageId`, not `pipelineId`: a deal is placed on a **stage**, and the stage
 * determines the pipeline. Get stage ids from the List Pipelines action, whose
 * response nests each pipeline's stages.
 *
 * ## The empty-`userIds` trap
 *
 * Worth surfacing because the failure is invisible until an agent complains:
 *
 *   > "Sending a request with an empty `userIds` argument will create a deal
 *   > that no agents can see. This may be intentional, depending on your use
 *   > case, but note that agents will not be able to access the deal unless
 *   > their user ID is explicitly included. Admins and owners can still see all
 *   > deals."
 *
 * So a deal created by an integration that does not populate `userIds` is
 * invisible to every agent in the brokerage while looking perfectly fine to the
 * admin who set the integration up.
 *
 * ## The real-estate date fields are the point
 *
 * `earnestMoneyDueDate`, `mutualAcceptanceDate`, `dueDiligenceDate`,
 * `finalWalkThroughDate` and `possessionDate` are first-class fields, not custom
 * ones. This is what makes Follow Up Boss a real-estate CRM rather than a
 * generic one, and they are grouped together here for that reason.
 *
 * ## `orderWeight` is rewritten after you set it
 *
 * "once the stage has been created, the `orderWeight` for all stages will be
 * recalculated to enforce the new ordering with gaps of 1000." So the value you
 * send positions the record; it is not the value you will read back.
 */
const createDeal: ActionDefinition<Input> = {
  key: "create-deal",
  type: "perform",
  resource: "deal",
  title: "Create Deal",
  idempotent: false,
  description:
    "Create a transaction on a pipeline stage, with price, commission split and the real-estate " +
    "milestone dates. Populate Agent user ids — a deal created without them is invisible to " +
    "every agent, though admins and owners still see it.",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "stageId",
      label: "Stage id",
      type: "number",
      required: true,
      hint: "The pipeline stage to place the deal on — the stage implies the pipeline, so there " +
        "is no separate pipeline field. Stage ids are nested inside each pipeline in the List " +
        "Pipelines response.",
    },
    {
      key: "peopleIds",
      label: "Person ids",
      type: "array",
      item: { type: "number" },
      hint: "Contacts party to this deal.",
    },
    {
      key: "userIds",
      label: "Agent user ids",
      type: "array",
      item: { type: "number" },
      hint: "Agents who can see this deal. **Leave this empty and no agent can see the deal** — " +
        "only admins and owners will. Ids come from the List Users action.",
    },
    { key: "price", label: "Price", type: "number" },
    {
      key: "projectedCloseDate",
      label: "Projected close date",
      type: "string",
      hint: "ISO-8601.",
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "earnestMoneyDueDate",
      label: "Earnest money due",
      type: "string",
      advanced: true,
      hint: "ISO-8601.",
    },
    {
      key: "mutualAcceptanceDate",
      label: "Mutual acceptance",
      type: "string",
      advanced: true,
      hint: "ISO-8601.",
    },
    {
      key: "dueDiligenceDate",
      label: "Due diligence",
      type: "string",
      advanced: true,
      hint: "ISO-8601.",
    },
    {
      key: "finalWalkThroughDate",
      label: "Final walk-through",
      type: "string",
      advanced: true,
      hint: "ISO-8601.",
    },
    {
      key: "possessionDate",
      label: "Possession",
      type: "string",
      advanced: true,
      hint: "ISO-8601.",
    },
    { key: "commissionValue", label: "Commission value", type: "number", advanced: true },
    {
      key: "agentCommission",
      label: "Agent commission",
      type: "number",
      advanced: true,
      hint: "The agent's share of the split.",
    },
    {
      key: "teamCommission",
      label: "Team commission",
      type: "number",
      advanced: true,
      hint: "The team's share of the split.",
    },
    {
      key: "orderWeight",
      label: "Order weight",
      type: "number",
      advanced: true,
      hint: "Positions the deal in a custom sort order. Follow Up Boss recalculates every weight " +
        "afterwards to leave gaps of 1000, so this value places the record but is not the value " +
        "you read back.",
    },
    {
      ...CUSTOM_FIELDS_PARAM,
      hint:
        'JSON object of deal custom fields, e.g. `{"customField1": "..."}`. Names come from the ' +
        "`/dealCustomFields` endpoint — deals have their own custom-field namespace, separate " +
        "from people's.",
    },
  ],
  output: [{ key: "id", type: "number", label: "Deal id" }],

  execute(input, ctx) {
    const body = withCustomFields({
      name: input.name,
      stageId: input.stageId,
      description: input.description,
      peopleIds: input.peopleIds,
      userIds: input.userIds,
      price: input.price,
      projectedCloseDate: input.projectedCloseDate,
      orderWeight: input.orderWeight,
      commissionValue: input.commissionValue,
      agentCommission: input.agentCommission,
      teamCommission: input.teamCommission,
      earnestMoneyDueDate: input.earnestMoneyDueDate,
      mutualAcceptanceDate: input.mutualAcceptanceDate,
      dueDiligenceDate: input.dueDiligenceDate,
      finalWalkThroughDate: input.finalWalkThroughDate,
      possessionDate: input.possessionDate,
    }, input.customFields);

    return new FubClient(ctx).request("/deals", { method: "POST", body });
  },
};

export default createDeal;
