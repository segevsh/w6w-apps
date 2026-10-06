import { goalPostAction } from "../lib/factories.ts";

/** `POST /users/u/goals/g/cancel_stepdown.json` */
export default goalPostAction(
  "cancel-stepdown",
  "Cancel Pledge Step Down",
  "Cancel a pending step-down of a goal's pledge; the pledge stays at its current amount.",
  "cancel_stepdown",
  true,
);
