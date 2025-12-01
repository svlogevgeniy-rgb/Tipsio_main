import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create test manager user
  const passwordHash = await hash("password123", 12);
  
  const manager = await prisma.user.upsert({
    where: { email: "manager@test.com" },
    update: {},
    create: {
      email: "manager@test.com",
      passwordHash,
      role: "MANAGER",
      emailVerified: new Date(),
    },
  });

  console.log("✅ Created manager:", manager.email);

  // Create test venue
  const venue = await prisma.venue.upsert({
    where: { id: "test-venue-001" },
    update: {},
    create: {
      id: "test-venue-001",
      name: "Cafe Organic Canggu",
      type: "CAFE",
      address: "Jl. Batu Bolong No. 123, Canggu, Bali",
      status: "ACTIVE",
      distributionMode: "PERSONAL",
      allowStaffChoice: true,
      midtransConnected: true,
      midtransMerchantId: "G123456789",
      midtransClientKey: "SB-Mid-client-test",
      // Note: In real scenario, serverKey would be encrypted
      midtransServerKey: "SB-Mid-server-test",
      midtransEnvironment: "sandbox",
      managerId: manager.id,
    },
  });

  console.log("✅ Created venue:", venue.name);

  // Create test staff members
  const staff1 = await prisma.staff.upsert({
    where: { id: "test-staff-001" },
    update: {},
    create: {
      id: "test-staff-001",
      displayName: "Agung",
      fullName: "I Made Agung",
      role: "WAITER",
      status: "ACTIVE",
      participatesInPool: true,
      venueId: venue.id,
    },
  });

  const staff2 = await prisma.staff.upsert({
    where: { id: "test-staff-002" },
    update: {},
    create: {
      id: "test-staff-002",
      displayName: "Wayan",
      fullName: "Ni Wayan Sari",
      role: "BARISTA",
      status: "ACTIVE",
      participatesInPool: true,
      venueId: venue.id,
    },
  });

  const staff3 = await prisma.staff.upsert({
    where: { id: "test-staff-003" },
    update: {},
    create: {
      id: "test-staff-003",
      displayName: "Ketut",
      fullName: "I Ketut Budi",
      role: "BARTENDER",
      status: "ACTIVE",
      participatesInPool: true,
      venueId: venue.id,
    },
  });

  console.log("✅ Created staff:", staff1.displayName, staff2.displayName, staff3.displayName);

  // Create QR codes
  const personalQr = await prisma.qrCode.upsert({
    where: { shortCode: "agung001" },
    update: {},
    create: {
      shortCode: "agung001",
      type: "PERSONAL",
      label: "Agung's QR",
      status: "ACTIVE",
      venueId: venue.id,
      staffId: staff1.id,
    },
  });

  const tableQr = await prisma.qrCode.upsert({
    where: { shortCode: "table01" },
    update: {},
    create: {
      shortCode: "table01",
      type: "TABLE",
      label: "Table 1",
      status: "ACTIVE",
      venueId: venue.id,
    },
  });

  const venueQr = await prisma.qrCode.upsert({
    where: { shortCode: "organic" },
    update: {},
    create: {
      shortCode: "organic",
      type: "VENUE",
      label: "Main Entrance",
      status: "ACTIVE",
      venueId: venue.id,
    },
  });

  console.log("✅ Created QR codes:", personalQr.shortCode, tableQr.shortCode, venueQr.shortCode);

  console.log("\n🎉 Seeding complete!");
  console.log("\nTest URLs:");
  console.log("  Personal QR: http://localhost:3000/tip/agung001");
  console.log("  Table QR:    http://localhost:3000/tip/table01");
  console.log("  Venue QR:    http://localhost:3000/tip/organic");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
