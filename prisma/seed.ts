import 'dotenv/config';
import { PrismaClient, Role, Status, Priority } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as pg from 'pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg(
  new pg.Pool({ connectionString: process.env.DATABASE_URL }),
);

const prisma = new PrismaClient({ adapter });

// ============================================================
// Sample data constants
// ============================================================

const SALT_ROUNDS = 10;

const USERS = [
  {
    name: 'Admin User',
    email: 'admin@legalflow.com',
    password: 'Admin1234!',
    role: Role.ADMIN,
  },
  {
    name: 'Sarah Johnson',
    email: 'sarah@legalflow.com',
    password: 'Review1234!',
    role: Role.REVIEWER,
  },
];

const CASES = [
  {
    clientName: 'Michael Chen',
    email: 'michael.chen@email.com',
    phone: '+12125551234',
    description:
      'I was involved in a car accident three weeks ago on Highway 101. The other driver ran a red light and collided with my vehicle. I sustained injuries to my back and neck, and my car was totaled. The other driver insurance company is refusing to cover my medical expenses and is claiming I was partially at fault. I have been unable to work for the past two weeks due to my injuries and I am accumulating medical bills.',
    status: Status.NEW,
    aiAnalysis: {
      caseType: 'Personal Injury',
      priority: Priority.HIGH,
      summary:
        'Client was involved in a motor vehicle accident caused by another driver running a red light. Client sustained physical injuries resulting in inability to work and is experiencing insurance claim denial for medical expenses.',
      missingInformation: [
        'Exact date and location of accident',
        'Police report number',
        'Name of other drivers insurance company',
        'Specific medical diagnoses and treatment received',
        'Employment details for lost wages calculation',
        'Photos or evidence from the accident scene',
      ],
      recommendedAction:
        'Schedule urgent consultation. Request police report, all medical records, insurance correspondence, and employment documentation for lost wages claim.',
      confidenceScore: 0.94,
    },
  },
  {
    clientName: 'Jennifer Williams',
    email: 'jennifer.w@email.com',
    phone: '+13105559876',
    description:
      'My employer has been making my work environment unbearable for the past six months since I reported a safety violation to HR. I have been passed over for two promotions I was qualified for, received negative performance reviews that contradict my previous excellent ratings, and was moved to a less desirable shift. I believe this is retaliation for my protected activity. I have documented everything and kept copies of my original positive performance reviews.',
    status: Status.REVIEWING,
    aiAnalysis: {
      caseType: 'Employment Law',
      priority: Priority.HIGH,
      summary:
        'Client alleges workplace retaliation following a protected HR complaint about a safety violation. Pattern of adverse employment actions including denied promotions, negative performance reviews, and shift change suggest potential retaliation claim.',
      missingInformation: [
        'Date of original safety complaint',
        'HR complaint documentation',
        'Copies of contrasting performance reviews',
        'Details of the two denied promotions',
        'Names of other employees who received promotions',
        'Whether any witnesses observed the retaliation',
      ],
      recommendedAction:
        'High priority case with strong documentation. Schedule consultation within 48 hours. Advise client to preserve all communications and avoid discussing case at work.',
      confidenceScore: 0.91,
    },
  },
  {
    clientName: 'Robert Davis',
    email: 'rdavis@email.com',
    phone: '+17185554321',
    description:
      'I hired a contractor eight months ago to renovate my kitchen. We signed a contract for 45000 dollars with a completion date of 12 weeks. The contractor abandoned the project after four months having completed only about 40 percent of the work and having received 35000 dollars in payments. He is not responding to calls or emails. The partial work has significant defects including improper electrical work that a licensed electrician has since flagged as dangerous.',
    status: Status.CONTACTED,
    aiAnalysis: {
      caseType: 'Contract Dispute',
      priority: Priority.MEDIUM,
      summary:
        'Client contracted for kitchen renovation at 45000 dollars. Contractor abandoned project after receiving 35000 dollars with only 40 percent completion and left defective work including dangerous electrical issues.',
      missingInformation: [
        'Copy of signed contract',
        'Payment receipts and records',
        'Photos of current state of work',
        'Electrician report on dangerous electrical work',
        'Any written communications with contractor',
        'Contractor business license and insurance information',
      ],
      recommendedAction:
        'Review contract terms and payment schedule. Assess claims for breach of contract and recovery of overpayment. Evaluate potential for contractor license board complaint in addition to civil action.',
      confidenceScore: 0.88,
    },
  },
  {
    clientName: 'Amanda Torres',
    email: 'amanda.torres@email.com',
    phone: null,
    description:
      'My landlord has not returned my security deposit of 2400 dollars after I moved out six weeks ago. I left the apartment in excellent condition, did a walkthrough with the landlord who noted no damages, and took photos on move-out day. The landlord is now claiming damages that did not exist and has sent me an itemized list of deductions that seem fabricated. I have the walkthrough photos and text messages from the landlord saying the apartment was in good condition.',
    status: Status.NEW,
    aiAnalysis: {
      caseType: 'Property Dispute',
      priority: Priority.LOW,
      summary:
        'Client disputes wrongful withholding of 2400 dollar security deposit. Client has strong documentation including move-out photos and landlord communications acknowledging good condition of the apartment.',
      missingInformation: [
        'State of residence for applicable landlord-tenant law',
        'Copy of original lease agreement',
        'Move-out inspection documentation',
        'Landlord itemized deduction list',
        'Exact move-out date',
        'Whether statutory deadline for deposit return has passed',
      ],
      recommendedAction:
        'Client has strong evidence for small claims court. Review applicable security deposit laws for jurisdiction. Calculate whether statutory damages and attorneys fees may be available.',
      confidenceScore: 0.87,
    },
  },
  {
    clientName: 'James Patterson',
    email: 'james.p@email.com',
    phone: '+12015557654',
    description:
      'My wife and I have decided to divorce after 14 years of marriage. We have two children aged 8 and 11. We own a home together and have retirement accounts. My wife has already hired a lawyer and I need representation. We were not able to agree on custody arrangements during our initial discussion. I am the primary earner and my wife has been working part time for the past five years to care for the children.',
    status: Status.CLOSED,
    aiAnalysis: {
      caseType: 'Family Law',
      priority: Priority.HIGH,
      summary:
        'Client requires divorce representation in contested matter involving minor children, real property, and retirement assets. Opposing party is already represented by counsel making prompt legal representation critical.',
      missingInformation: [
        'State of residence for jurisdiction',
        'Whether divorce petition has been filed',
        'Details of disputed custody arrangements',
        'Approximate value of marital home',
        'Retirement account details and values',
        'Current parenting schedule',
        'Any existing court orders',
      ],
      recommendedAction:
        'Urgent. Opposing party already has counsel. Schedule consultation immediately. Review any documents already filed or served.',
      confidenceScore: 0.93,
    },
  },
];

// ============================================================
// Main seed function
// ============================================================

async function main() {
  // eslint-disable-next-line no-console
  console.log('🌱 Starting database seed...');

  // ── Clean existing data ──────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('🧹 Cleaning existing data...');

  await prisma.auditLog.deleteMany();
  await prisma.aiAnalysis.deleteMany();
  await prisma.case.deleteMany();
  await prisma.user.deleteMany();

  // ── Create users ─────────────────────────────────────────
  // eslint-disable-next-line no-console
  console.log('👤 Creating users...');

  const createdUsers: Record<string, { id: string }> = {};

  for (const userData of USERS) {
    const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
      },
    });

    createdUsers[userData.email] = user;

    // eslint-disable-next-line no-console
    console.log(`  ✅ Created user: ${userData.name} (${userData.role})`);
  }

  const adminUser = createdUsers['admin@legalflow.com'];

  // ── Create cases with AI analysis and audit logs ─────────
  // eslint-disable-next-line no-console
  console.log('📋 Creating cases...');

  for (const caseData of CASES) {
    const { aiAnalysis, ...caseFields } = caseData;

    // Create the case
    const createdCase = await prisma.case.create({
      data: caseFields,
    });

    // Create the AI analysis
    await prisma.aiAnalysis.create({
      data: {
        caseId: createdCase.id,
        caseType: aiAnalysis.caseType,
        priority: aiAnalysis.priority,
        summary: aiAnalysis.summary,
        missingInformation: aiAnalysis.missingInformation,
        recommendedAction: aiAnalysis.recommendedAction,
        confidenceScore: aiAnalysis.confidenceScore,
      },
    });

    // Create audit log for case creation
    await prisma.auditLog.create({
      data: {
        caseId: createdCase.id,
        userId: null,
        action: 'CASE_CREATED',
        metadata: {},
      },
    });

    // Create audit log for AI analysis
    await prisma.auditLog.create({
      data: {
        caseId: createdCase.id,
        userId: null,
        action: 'ANALYSIS_GENERATED',
        metadata: {
          caseType: aiAnalysis.caseType,
          priority: aiAnalysis.priority,
        },
      },
    });

    // Add status change logs for non-NEW cases
    if (createdCase.status === Status.REVIEWING) {
      await prisma.auditLog.create({
        data: {
          caseId: createdCase.id,
          userId: adminUser.id,
          action: 'STATUS_CHANGED',
          metadata: {
            previousStatus: 'NEW',
            newStatus: 'REVIEWING',
          },
        },
      });
    }

    if (createdCase.status === Status.CONTACTED) {
      await prisma.auditLog.create({
        data: {
          caseId: createdCase.id,
          userId: adminUser.id,
          action: 'STATUS_CHANGED',
          metadata: {
            previousStatus: 'NEW',
            newStatus: 'REVIEWING',
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          caseId: createdCase.id,
          userId: adminUser.id,
          action: 'STATUS_CHANGED',
          metadata: {
            previousStatus: 'REVIEWING',
            newStatus: 'CONTACTED',
          },
        },
      });
    }

    if (createdCase.status === Status.CLOSED) {
      await prisma.auditLog.create({
        data: {
          caseId: createdCase.id,
          userId: adminUser.id,
          action: 'STATUS_CHANGED',
          metadata: {
            previousStatus: 'NEW',
            newStatus: 'REVIEWING',
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          caseId: createdCase.id,
          userId: adminUser.id,
          action: 'STATUS_CHANGED',
          metadata: {
            previousStatus: 'REVIEWING',
            newStatus: 'CONTACTED',
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          caseId: createdCase.id,
          userId: adminUser.id,
          action: 'STATUS_CHANGED',
          metadata: {
            previousStatus: 'CONTACTED',
            newStatus: 'CLOSED',
          },
        },
      });
    }

    // eslint-disable-next-line no-console
    console.log(
      `  ✅ Created case: ${caseData.clientName} (${aiAnalysis.caseType} - ${aiAnalysis.priority})`,
    );
  }

  // ── Summary ───────────────────────────────────────────────
  const userCount = await prisma.user.count();
  const caseCount = await prisma.case.count();
  const analysisCount = await prisma.aiAnalysis.count();
  const auditCount = await prisma.auditLog.count();

  // eslint-disable-next-line no-console
  console.log('\n✨ Seed complete!');
  // eslint-disable-next-line no-console
  console.log('─────────────────────────────');
  // eslint-disable-next-line no-console
  console.log(`👤 Users created:     ${userCount}`);
  // eslint-disable-next-line no-console
  console.log(`📋 Cases created:     ${caseCount}`);
  // eslint-disable-next-line no-console
  console.log(`🤖 Analyses created:  ${analysisCount}`);
  // eslint-disable-next-line no-console
  console.log(`📝 Audit logs:        ${auditCount}`);
  // eslint-disable-next-line no-console
  console.log('─────────────────────────────');
  // eslint-disable-next-line no-console
  console.log('\n🔑 Login credentials:');
  // eslint-disable-next-line no-console
  console.log('  Admin:    admin@legalflow.com  / Admin1234!');
  // eslint-disable-next-line no-console
  console.log('  Reviewer: sarah@legalflow.com  / Review1234!');
}

// ============================================================
// Run
// ============================================================

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
