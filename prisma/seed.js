require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@roadguard.com" },
    update: {},
    create: {
      email: "admin@roadguard.com",
      password: adminPassword,
      name: "Admin User",
      role: "ADMIN",
      level: "PLATINUM",
      contributionScore: 1000,
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // Create test users
  const testPassword = await bcrypt.hash("password123", 12);
  const testUsers = [
    { email: "driver1@test.com", name: "John Driver", vehicleType: "CAR" },
    { email: "driver2@test.com", name: "Jane Rider", vehicleType: "BIKE" },
    {
      email: "trucker@test.com",
      name: "Bob Trucker",
      vehicleType: "TRUCK",
      role: "TRUSTED_DRIVER",
    },
  ];

  for (const userData of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        password: testPassword,
        contributionScore: Math.floor(Math.random() * 200),
        totalReports: Math.floor(Math.random() * 50),
        verifiedReports: Math.floor(Math.random() * 30),
      },
    });
    console.log("✅ Test user created:", user.email);
  }

  // Create sample alerts
  const users = await prisma.user.findMany({ take: 3 });

  const sampleAlerts = [
    {
      type: "POTHOLE",
      severity: "MEDIUM",
      title: "Large pothole on Main Street",
      description: "Deep pothole near the intersection",
      latitude: 23.8103,
      longitude: 90.4125,
      address: "Main Street, Dhaka",
      roadName: "Main Street",
      area: "Gulshan",
      reporterId: users[0]?.id,
    },
    {
      type: "ACCIDENT",
      severity: "HIGH",
      title: "Vehicle collision",
      description: "Two car collision, traffic blocked",
      latitude: 23.7925,
      longitude: 90.4078,
      address: "Airport Road, Dhaka",
      roadName: "Airport Road",
      area: "Uttara",
      reporterId: users[1]?.id,
    },
    {
      type: "FLOOD",
      severity: "CRITICAL",
      title: "Waterlogged road",
      description: "Road flooded after heavy rain",
      latitude: 23.7506,
      longitude: 90.3938,
      address: "Mirpur Road, Dhaka",
      roadName: "Mirpur Road",
      area: "Mirpur",
      reporterId: users[2]?.id,
    },
  ];

  for (const alertData of sampleAlerts) {
    if (alertData.reporterId) {
      const alert = await prisma.alert.create({
        data: {
          ...alertData,
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      console.log("✅ Sample alert created:", alert.title);
    }
  }

  // Create system settings
  const defaultSettings = [
    { key: "notification_radius", value: { meters: 500 } },
    { key: "map_default_zoom", value: { level: 13 } },
    { key: "max_images_per_alert", value: { count: 5 } },
    { key: "verification_threshold", value: { upvotes: 3, ratio: 0.7 } },
  ];

  for (const setting of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log("✅ System settings configured");

  console.log("🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
