import { runDoctorCommand } from "./src/skillLabBackend.js";

async function main() {
  try {
    const res = await runDoctorCommand();
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err);
  }
}

main();
