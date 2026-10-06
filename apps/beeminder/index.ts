import type { AppDefinition } from "@w6w/types";
import cancelStepdown from "./actions/cancel-stepdown.ts";
import createCharge from "./actions/create-charge.ts";
import createDatapoint from "./actions/create-datapoint.ts";
import createDatapoints from "./actions/create-datapoints.ts";
import createGoal from "./actions/create-goal.ts";
import deleteDatapoint from "./actions/delete-datapoint.ts";
import getGoal from "./actions/get-goal.ts";
import getUser from "./actions/get-user.ts";
import listArchivedGoals from "./actions/list-archived-goals.ts";
import listDatapoints from "./actions/list-datapoints.ts";
import listGoals from "./actions/list-goals.ts";
import ratchetGoal from "./actions/ratchet-goal.ts";
import refreshGraph from "./actions/refresh-graph.ts";
import shortcircuitGoal from "./actions/shortcircuit-goal.ts";
import stepdownGoal from "./actions/stepdown-goal.ts";
import uncleGoal from "./actions/uncle-goal.ts";
import updateDatapoint from "./actions/update-datapoint.ts";
import updateGoal from "./actions/update-goal.ts";
import authToken from "./auth/auth-token.ts";
import api from "./health/api.ts";
import service from "./health/service.ts";

/**
 * Beeminder — goal tracking with commitment contracts (goals, datapoints, pledges, charges).
 * Findings that shaped this app (2026-10-06):
 *
 * - The personal token is the `auth_token` query parameter, NOT `access_token` (that is the
 *   OAuth client token). It is stamped in `sign`, for every method, including POST.
 * - Errors are `{"errors": string | object}`, but an unknown path is `{"error": "…"}` (singular)
 *   with a 404, and auth is checked before routing for known paths — the health check reads
 *   the body shape, not just the status.
 * - `uncleme`, `shortcircuit` and `charges` move real money immediately; `dial_road` is
 *   deprecated in favour of `roadall` and is not covered.
 */
const app: AppDefinition = {
  actions: [
    cancelStepdown,
    createCharge,
    createDatapoint,
    createDatapoints,
    createGoal,
    deleteDatapoint,
    getGoal,
    getUser,
    listArchivedGoals,
    listDatapoints,
    listGoals,
    ratchetGoal,
    refreshGraph,
    shortcircuitGoal,
    stepdownGoal,
    uncleGoal,
    updateDatapoint,
    updateGoal,
  ],
  auth: [authToken],
  healthChecks: [service, api],
};

export default app;
