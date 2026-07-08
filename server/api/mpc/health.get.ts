import { checkHealth } from "../../services/mpc";

export default defineEventHandler(() => {
  return checkHealth();
});
