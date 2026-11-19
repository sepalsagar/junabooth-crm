import "dotenv/config";
import { db } from "@/lib/db";
import { seedAuth } from "@/lib/seed-auth";
if (process.env.E2E !== "1") throw new Error("E2E=1 is required");
const email=process.env.E2E_SALES_EMAIL,password=process.env.E2E_SALES_PASSWORD,disabledEmail=process.env.E2E_DISABLED_EMAIL,disabledPassword=process.env.E2E_DISABLED_PASSWORD;
if (!email||!password||!disabledEmail||!disabledPassword) throw new Error("E2E credentials are required");
const salesEmail: string = email;
const salesPassword: string = password;
const disabledTestEmail: string = disabledEmail;
const disabledTestPassword: string = disabledPassword;
if (!salesEmail.endsWith("@e2e.invalid") || !disabledTestEmail.endsWith("@e2e.invalid")) throw new Error("E2E emails must use @e2e.invalid");

async function main() {
  await seedAuth.api.signUpEmail({ body: { name: "E2E Sales", email: salesEmail, password: salesPassword } });
  await seedAuth.api.signUpEmail({ body: { name: "E2E Disabled", email: disabledTestEmail, password: disabledTestPassword } });
  await db.user.update({ where: { email: salesEmail }, data: { role: "SALES" } });
  await db.user.update({ where: { email: disabledTestEmail }, data: { role: "SALES", disabled: true } });
  console.log("E2E users created=2");
}

main()
  .catch(() => {
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
