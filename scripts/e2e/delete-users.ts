import "dotenv/config";
import { db } from "@/lib/db";
if (process.env.E2E !== "1") throw new Error("E2E=1 is required");
void (async () => { const users=await db.user.findMany({where:{email:{endsWith:"@e2e.invalid"}},select:{id:true}}); for(const user of users){await db.session.deleteMany({where:{userId:user.id}});await db.account.deleteMany({where:{userId:user.id}});} const deleted=await db.user.deleteMany({where:{email:{endsWith:"@e2e.invalid"}}}); console.log(`E2E users deleted=${deleted.count} sessions=removed`); })();
