import type { ActionDefinition } from "@w6w/types";
import { CUSTOM_FIELDS_PARAM, FubClient, withCustomFields } from "../lib/client.ts";

interface Input {
  id: number;
  name?: string;
  stageId?: number;
  description?: string;
  peopleIds?: number[];
  userIds?: number[];
  price?: number;
  projectedCloseDate?: string;
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
 * `PUT /deals/{id}` — update a transaction. Usually: move it to the next stage.
 *
 * The empty-`userIds` warning from Create Deal applies here verbatim and is
 * arguably worse on an update — sending `userIds: []` to a deal that agents
 * could previously see takes it away from them. `lib/client.ts`'s `compact()`
 * means an untouched field is omitted rather than sent empty, so this only
 * happens if a workflow explicitly passes an empty array.
 *
 * ## A vendor typo to be aware of when reading the docs
 *
 * The `PUT /deals/{id}` schema spells two fields `agentCommision` and
 * `teamComission` — one `m`, one `s` short of the `agentCommission` /
 * `teamCommission` used by `POST /deals`, by the response examples of *both*
 * endpoints, and by `GET /deals`. Three sources against one typo, so the
 * correctly-spelled forms are sent here. Flagged because someone reading the PUT
 * page alone would reasonably copy the misspelling and then wonder why the
 * commission never updates.
 *
 * `orderWeight` is absent: it is documented on `POST` and on the stage
 * endpoints, but not in this request schema.
 */
const updateDeal: ActionDefinition<Input> = {
  key: "update-deal",
  type: "perform",
  resource: "deal",
  title: "Update Deal",
  idempotent: true,
  description:
    "Update a transaction — most often to advance its stage, revise the price or fill in a " +
    "milestone date. Person and agent id lists REPLACE the existing ones, so send the full set.",
  params: [
    { key: "id", label: "Deal id", type: "number", required: true },
    {
      key: "stageId",
      label: "Stage id",
      type: "number",
      hint: "Move the deal to this stage. Stage ids are nested in the List Pipelines response.",
    },
    { key: "name", label: "Name", type: "string" },
    { key: "price", label: "Price", type: "number" },
    {
      key: "projectedCloseDate",
      label: "Projected close date",
      type: "string",
      hint: "ISO-8601.",
    },
    { key: "description", label: "Description", type: "text" },
    {
      key: "peopleIds",
      label: "Person ids",
      type: "array",
      item: { type: "number" },
      hint: "**Replaces** the deal's contacts — send the full list.",
    },
    {
      key: "userIds",
      label: "Agent user ids",
      type: "array",
      item: { type: "number" },
      hint: "**Replaces** the deal's agents. Sending an empty list hides the deal from every " +
        "agent (admins and owners still see it).",
    },
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
    { key: "agentCommission", label: "Agent commission", type: "number", advanced: true },
    { key: "teamCommission", label: "Team commission", type: "number", advanced: true },
    {
      ...CUSTOM_FIELDS_PARAM,
      hint:
        'JSON object of deal custom fields, e.g. `{"customField1": "..."}`. Names come from the ' +
        "`/dealCustomFields` endpoint.",
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
      commissionValue: input.commissionValue,
      // Correctly spelled, against this endpoint's own typo — see the module
      // comment.
      agentCommission: input.agentCommission,
      teamCommission: input.teamCommission,
      earnestMoneyDueDate: input.earnestMoneyDueDate,
      mutualAcceptanceDate: input.mutualAcceptanceDate,
      dueDiligenceDate: input.dueDiligenceDate,
      finalWalkThroughDate: input.finalWalkThroughDate,
      possessionDate: input.possessionDate,
    }, input.customFields);

    return new FubClient(ctx).request(`/deals/${input.id}`, { method: "PUT", body });
  },
};

export default updateDeal;
