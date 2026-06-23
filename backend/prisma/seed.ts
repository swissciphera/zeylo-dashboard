// Minimal seed: platform settings only (no heavy demo data).
// The first platform admin is created via the /admin setup flow (n8n/Chatwoot style),
// NOT here, so the first-run experience is preserved.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });
  // eslint-disable-next-line no-console
  console.log('Seed complete: platform settings ensured.');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
