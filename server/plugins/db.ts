import { initDb } from "../db/index";

export default defineNitroPlugin(() => {
  initDb();
});
