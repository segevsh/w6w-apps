import { goalPostAction } from "../lib/factories.ts";

/** `POST /users/u/goals/g/stepdown.json` */
export default goalPostAction(
  "stepdown-goal",
  "Step Down Goal Pledge",
  "Schedule a decrease of the goal's pledge level. It applies after the akrasia horizon, " +
    "not immediately; the goal then shows a countdown to the lower pledge.",
  "stepdown",
  true,
);
