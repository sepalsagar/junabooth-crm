import 'dotenv/config';
import { seedAuth } from '../src/lib/seed-auth';
import { configuredSeedPartners } from '../src/lib/seed-partners';

async function testLogin() {
  const partners = configuredSeedPartners();
  console.log(`Testing login for ${partners.length} configured seed partners...`);

  for (const p of partners) {
    try {
      const res = await seedAuth.api.signInEmail({
        body: {
          email: p.email,
          password: p.password,
        }
      });
      if (res && res.user) {
        console.log(`✓ Login SUCCESS for: ${p.name} (${p.email}) -> User ID: ${res.user.id}`);
      } else {
        console.log(`✗ Login FAILED for: ${p.name} (${p.email})`);
      }
    } catch (err: any) {
      console.error(`✗ Login ERROR for: ${p.name} (${p.email}):`, err.message || err);
    }
  }
}

testLogin().then(() => process.exit(0)).catch(console.error);
