import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Create roles
  const adminRole = await prisma.roles.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin' },
  });

  await prisma.roles.upsert({
    where: { name: 'customer' },
    update: {},
    create: { name: 'customer' },
  });

  const fleetManagerRole = await prisma.roles.upsert({
    where: { name: 'fleet_manager' },
    update: {},
    create: { name: 'fleet_manager' },
  });

  await prisma.roles.upsert({
    where: { name: 'delivery_partner' },
    update: {},
    create: { name: 'delivery_partner' },
  });

  // create regions
  let existingRegion = await prisma.regions.findFirst({
    where: { name: 'region1' },
  });

  if (!existingRegion) {
    existingRegion = await prisma.regions.create({
      data: {
        name: 'region1',
        city: 'Trivandrum',
        pincode: '682001',
      },
    });
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash('password@123', 10);

  await prisma.users.upsert({
    where: { email: 'admin@protmeals.com' },
    update: {},
    create: {
      email: 'admin@protmeals.com',
      name: 'Admin',
      password: hashedPassword,
      role: { connect: { id: adminRole.id } },
      status: 'active',
    },
  });

  await prisma.users.upsert({
    where: { email: 'fleet-manager@protmeals.com' },
    update: {},
    create: {
      email: 'fleet-manager@protmeals.com',
      name: 'Fleet Manager',
      password: hashedPassword,
      role: { connect: { id: fleetManagerRole.id } },
      status: 'active',
      region: { connect: { id: existingRegion.id } },
    },
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
