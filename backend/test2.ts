import { getHealthPayload } from "./src/skillLabBackend.js";

async function main() {
  try {
    const res = await getHealthPayload();
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
