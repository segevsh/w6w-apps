import { goalPostAction } from "../lib/factories.ts";

/** `POST /users/u/goals/g/shortcircuit.json` — charges the current pledge. */
export default goalPostAction(
  "shortcircuit-goal",
  "Short Circuit Goal Pledge",
  "Increase the goal's pledge level and CHARGE the user the current pledge amount. " +
    "Moves real money; cannot be undone.",
  "shortcircuit",
  false,
);
