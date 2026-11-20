import 'dotenv/config';
import { getFirmCapitalSummary } from '../src/features/capital/queries';

async function verifyPartners() {
  const summary = await getFirmCapitalSummary();
  console.log('Firm Capital Summary:');
  console.log(`Firm Injected: ₹${summary.firmInjected.toLocaleString('en-IN')}`);
  console.log(`Firm Withdrawn: ₹${summary.firmWithdrawn.toLocaleString('en-IN')}`);
  console.log(`Firm Net: ₹${summary.firmNet.toLocaleString('en-IN')}`);
  console.log('\nPartners:');
  for (const p of summary.partners) {
    console.log(
      `${p.name.padEnd(10)} | Injected: ₹${p.injected.toLocaleString('en-IN').padStart(8)} | Withdrawn: ₹${p.withdrawn.toLocaleString('en-IN').padStart(8)} | Net: ₹${p.net.toLocaleString('en-IN').padStart(8)} | Share: ${p.share !== null ? (p.share * 100).toFixed(2) + '%' : '0%'}`
    );
  }
}

verifyPartners().then(() => process.exit(0)).catch(console.error);
