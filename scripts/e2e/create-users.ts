import "dotenv/config";
import { db } from "@/lib/db";
import { seedAuth } from "@/lib/seed-auth";
if (process.env.E2E !== "1") throw new Error("E2E=1 is required");
const email=process.env.E2E_SALES_EMAIL,password=process.env.E2E_SALES_PASSWORD,disabledEmail=process.env.E2E_DISABLED_EMAIL,disabledPassword=process.env.E2E_DISABLED_PASSWORD;
if (!email||!password||!disabledEmail||!disabledPassword) throw new Error("E2E credentials are required");
void (async () => { await seedAuth.api.signUpEmail({body:{name:"E2E Sales",email,password}}); await seedAuth.api.signUpEmail({body:{name:"E2E Disabled",email:disabledEmail,password:disabledPassword}}); await db.user.update({where:{email},data:{role:"SALES"}}); await db.user.update({where:{email:disabledEmail},data:{role:"SALES",disabled:true}}); console.log("E2E users created=2"); })();
