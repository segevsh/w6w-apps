import type { ActionDefinition } from "@w6w/types";
import { BeeminderClient, defined, mapGoal, splitList, userPath } from "../lib/client.ts";
import { GOAL_OUTPUT, USERNAME } from "../lib/factories.ts";

interface Input {
  username?: string;
  slug: string;
  title: string;
  goalType: string;
  gunits: string;
  goaldate?: number | null;
  goalval?: number | null;
  rate?: number | null;
  initval?: number;
  secret?: boolean;
  datapublic?: boolean;
  datasource?: string;
  tags?: string;
  dryrun?: boolean;
}

const GOAL_TYPES = ["hustler", "biker", "fatloser", "gainer", "inboxer", "drinker", "custom"];
const GOAL_TYPE_LABELS: Record<string, string> = {
  hustler: "Do More",
  biker: "Odometer",
  fatloser: "Weight loss",
  gainer: "Gain weight",
  inboxer: "Inbox fewer (whittle down)",
  drinker: "Do less",
  custom: "Custom",
};

const isSet = (v: unknown) => v !== undefined && v !== null && String(v) !== "";

/** `POST /users/u/goals.json` */
const createGoal: ActionDefinition<Input> = {
  key: "create-goal",
  type: "perform",
  resource: "goal",
  title: "Create Goal",
  description: "Create a goal. Exactly two of goal date, goal value and rate are required; " +
    "Beeminder computes the third. Use dry run to validate without creating.",
  idempotent: false,
  params: [
    USERNAME,
    { key: "slug", label: "Slug", type: "string", required: true, hint: "URL name of the goal." },
    { key: "title", label: "Title", type: "string", required: true },
    {
      key: "goalType",
      label: "Goal type",
      type: "select",
      required: true,
      options: GOAL_TYPES.map((v) => ({ value: v, label: GOAL_TYPE_LABELS[v] })),
    },
    {
      key: "gunits",
      label: "Goal units",
      type: "string",
      required: true,
      hint: 'e.g. "hours", "pushups", "pages".',
    },
    { key: "goaldate", label: "Goal date (unix seconds)", type: "number" },
    { key: "goalval", label: "Goal value", type: "number" },
    {
      key: "rate",
      label: "Rate",
      type: "number",
      hint: "Per day by default; set the rate units after creation via the road if needed.",
    },
    { key: "initval", label: "Initial value", type: "number", hint: "Value for today. Default 0." },
    { key: "secret", label: "Secret", type: "boolean" },
    { key: "datapublic", label: "Public datapoints", type: "boolean" },
    {
      key: "datasource",
      label: "Data source",
      type: "string",
      hint: 'One of "api", "ifttt", "zapier", or your registered client name. Blank = manual.',
    },
    { key: "tags", label: "Tags", type: "string", hint: "Alphanumeric, comma separated." },
    { key: "dryrun", label: "Dry run", type: "boolean", hint: "Validate without creating." },
  ],
  output: GOAL_OUTPUT,

  async execute(input, ctx) {
    const set = [input.goaldate, input.goalval, input.rate].filter(isSet).length;
    if (set !== 2) {
      throw new Error("Exactly two of goaldate, goalval and rate are required (got " + set + ")");
    }
    const tags = splitList(input.tags);
    const { data } = await new BeeminderClient(ctx).request(
      `${userPath(input.username)}/goals.json`,
      {
        method: "POST",
        json: defined({
          slug: input.slug,
          title: input.title,
          goal_type: input.goalType,
          gunits: input.gunits,
          // The reference passes the unset one as an explicit null.
          goaldate: isSet(input.goaldate) ? input.goaldate : null,
          goalval: isSet(input.goalval) ? input.goalval : null,
          rate: isSet(input.rate) ? input.rate : null,
          initval: input.initval,
          secret: input.secret,
          datapublic: input.datapublic,
          datasource: input.datasource || undefined,
          tags: tags.length ? tags : undefined,
          dryrun: input.dryrun,
        }),
      },
    );
    return mapGoal(data);
  },
};

export default createGoal;
