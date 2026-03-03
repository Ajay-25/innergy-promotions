/**
 * Seed script: Populate sewadar_core with 15 users for Access Management testing.
 *
 * - 2 Admins: Permissions full access (all keys). Role: admin. Profession: Service or Business.
 * - 2 Moderators: Permissions ['golden_members:edit', 'sewadars:view']. Role: moderator. Profession: Education/Teaching or Medical.
 * - 11 Volunteers: Permissions []. Role: volunteer. Mix of Qualification (Graduate, Post-Graduate) and Profession (Engineering, Retired, Student).
 *
 * All have system_role set (admin/moderator/volunteer) so status is effectively approved (not pending).
 * Realistic names, unique 10-digit phones, distributed across 12 zones.
 *
 * Run from project root:
 *   node scripts/seed-team.js
 * Or: node -r dotenv/config scripts/seed-team.js dotenv_config_path=.env.local
 */

const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') })

const { neon } = require('@neondatabase/serverless')

const ZONES = [
  'Zone-1(Delhi)',
  'Zone-2(Punjab)',
  'Zone-3(Haryana)',
  'Zone-4(Madhya Pradesh)',
  'Zone-5(Uttar Pradesh)',
  'Zone-6(Uttar Pradesh)',
  'Zone-7(Rajasthan)',
  'Zone-8(Maharashtra)',
  'Zone-9(South-Orissa/Hyderabad/Bengaluru/etc.)',
  'Zone-10(Bihar)',
  'Zone-11(Uttar Pradesh)',
  'Zone-12(Gujarat)',
]

/** Full access: all permission keys (matches lib/permissions.js ALL_PERMISSIONS). */
const ALL_PERMISSIONS = [
  'system:manage_access',
  'sewadars:view',
  'sewadars:register',
  'sewadars:edit',
  'sewadars:mark_attendance',
  'sewadars:edit_attendance',
  'sewadars:manage_roster',
  'events:view',
  'events:create',
  'events:manage_attendance',
  'promotions:view',
  'promotions:log',
  'golden_members:view',
  'golden_members:register',
  'golden_members:edit',
]

const FIRST_NAMES = [
  'Priya', 'Rahul', 'Anjali', 'Vikram', 'Meera', 'Arjun', 'Kavita', 'Suresh',
  'Deepa', 'Rajesh', 'Lakshmi', 'Amit', 'Neha', 'Karan', 'Pooja',
]

const LAST_NAMES = [
  'Sharma', 'Patel', 'Kumar', 'Singh', 'Reddy', 'Nair', 'Iyer', 'Gupta',
  'Mehta', 'Desai', 'Pillai', 'Rao', 'Menon', 'Pandey', 'Narayan',
]

const ADMIN_PROFESSIONS = ['Service', 'Business']
const MODERATOR_PROFESSIONS = ['Education/Teaching', 'Medical']
const VOLUNTEER_QUALIFICATIONS = ['Graduate', 'Post-Graduate']
const VOLUNTEER_PROFESSIONS = ['Engineering', 'Retired', 'Student']

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Unique 10-digit Indian mobile (6–9 prefix). */
function randomPhone(used) {
  let n
  do {
    const prefix = pick(['6', '7', '8', '9'])
    const rest = String(randomInt(0, 999999999)).padStart(9, '0')
    n = prefix + rest
  } while (used.has(n))
  used.add(n)
  return n
}

function slug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('Missing DATABASE_URL. Set it in .env.local or the environment.')
    process.exit(1)
  }

  console.log('Seeding Started')

  const sql = neon(process.env.DATABASE_URL)

  const usedPhones = new Set()
  const usedEmails = new Set()

  const rows = []

  // —— 2 Admins: full permissions, is_field_volunteer = false, Profession: Service or Business ——
  for (let i = 0; i < 2; i++) {
    const first = FIRST_NAMES[i]
    const last = LAST_NAMES[i]
    const name = `${first} ${last}`
    const phone = randomPhone(usedPhones)
    let email = `${slug(first)}.${slug(last)}@organization.org`
    while (usedEmails.has(email)) {
      email = `${slug(first)}.${slug(last)}.admin${i}@organization.org`
    }
    usedEmails.add(email)
    rows.push({
      name,
      email,
      phone: `+91${phone}`,
      system_role: 'admin',
      permissions: ALL_PERMISSIONS,
      is_field_volunteer: false,
      zone: ZONES[i % ZONES.length],
      center: `Center ${(i % 4) + 1}`,
      qualification: '',
      qualification_other: '',
      profession: pick(ADMIN_PROFESSIONS),
      profession_other: '',
    })
  }

  // —— 2 Moderators: limited permissions, Profession: Education/Teaching or Medical ——
  const moderatorPerms = ['golden_members:edit', 'sewadars:view']
  for (let i = 0; i < 2; i++) {
    const first = FIRST_NAMES[2 + i]
    const last = LAST_NAMES[2 + i]
    const name = `${first} ${last}`
    const phone = randomPhone(usedPhones)
    let email = `${slug(first)}.${slug(last)}@organization.org`
    while (usedEmails.has(email)) {
      email = `${slug(first)}.${slug(last)}.mod${i}@organization.org`
    }
    usedEmails.add(email)
    rows.push({
      name,
      email,
      phone: `+91${phone}`,
      system_role: 'moderator',
      permissions: moderatorPerms,
      is_field_volunteer: true,
      zone: ZONES[(2 + i) % ZONES.length],
      center: `Center ${(i % 4) + 1}`,
      qualification: '',
      qualification_other: '',
      profession: pick(MODERATOR_PROFESSIONS),
      profession_other: '',
    })
  }

  // —— 11 Volunteers: permissions [], mix of Qualification and Profession ——
  for (let i = 0; i < 11; i++) {
    const first = FIRST_NAMES[4 + (i % FIRST_NAMES.length)]
    const last = LAST_NAMES[4 + (i % LAST_NAMES.length)]
    const name = `${first} ${last}`
    const phone = randomPhone(usedPhones)
    let email = `${slug(first)}.${slug(last)}.vol${i + 1}@organization.org`
    while (usedEmails.has(email)) {
      email = `${slug(first)}.${slug(last)}.vol${i + 1}.${randomInt(1, 99)}@organization.org`
    }
    usedEmails.add(email)
    rows.push({
      name,
      email,
      phone: `+91${phone}`,
      system_role: 'volunteer',
      permissions: [],
      is_field_volunteer: true,
      zone: ZONES[i % ZONES.length],
      center: `Center ${(i % 5) + 1}`,
      qualification: pick(VOLUNTEER_QUALIFICATIONS),
      qualification_other: '',
      profession: pick(VOLUNTEER_PROFESSIONS),
      profession_other: '',
    })
  }

  try {
    for (const row of rows) {
      await sql`
        INSERT INTO sewadar_core (
          name, email, phone, system_role, permissions,
          is_field_volunteer, zone, center,
          qualification, qualification_other, profession, profession_other
        )
        VALUES (
          ${row.name},
          ${row.email},
          ${row.phone},
          ${row.system_role},
          ${row.permissions},
          ${row.is_field_volunteer},
          ${row.zone},
          ${row.center},
          ${row.qualification ?? ''},
          ${row.qualification_other ?? ''},
          ${row.profession ?? ''},
          ${row.profession_other ?? ''}
        )
      `
    }
  } catch (err) {
    if (err.code === '23505') {
      console.error('Duplicate email: one or more organization.org emails already exist in sewadar_core.')
    }
    throw err
  }

  console.log('Seeding Completed')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
