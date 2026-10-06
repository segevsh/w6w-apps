import type { ActionDefinition } from "@w6w/types";
import { BeeminderClient, goalPath, mapGoal } from "../lib/client.ts";
import { GOAL_OUTPUT, SLUG, USERNAME } from "../lib/factories.ts";

interface Input {
  username?: string;
  slug: string;
  newsafety: number;
  beemergency?: boolean;
}

/** `POST /users/u/goals/g/ratchet.json` */
const ratchetGoal: ActionDefinition<Input> = {
  key: "ratchet-goal",
  type: "perform",
  resource: "goal",
  title: "Ratchet Goal",
  description: "Ratchet a goal down by reducing its safety buffer (days for do-more goals, " +
    "units for do-less goals), moving the bright red line closer to your data. Ratcheting to " +
    "0 needs `beemergency`.",
  idempotent: true,
  params: [
    USERNAME,
    SLUG,
    {
      key: "newsafety",
      label: "New safety buffer",
      type: "number",
      required: true,
      validation: { min: 0 },
      hint: "Days of buffer for do-more goals; units of buffer for do-less goals.",
    },
    {
      key: "beemergency",
      label: "Allow ratcheting to zero",
      type: "boolean",
      hint: "Required when the new safety buffer is 0.",
    },
  ],
  output: GOAL_OUTPUT,

  async execute(input, ctx) {
    const newsafety = Number(input.newsafety);
    if (input.newsafety === undefined || input.newsafety === null || Number.isNaN(newsafety)) {
      throw new Error("newsafety is required and must be a number");
    }
    if (newsafety === 0 && !input.beemergency) {
      throw new Error("Ratcheting to 0 requires beemergency to be true");
    }
    const { data } = await new BeeminderClient(ctx).request(
      `${goalPath(input.username, input.slug)}/ratchet.json`,
      {
        method: "POST",
        form: { newsafety, beemergency: input.beemergency ? "true" : undefined },
      },
    );
    return mapGoal(data);
  },
};

export default ratchetGoal;
