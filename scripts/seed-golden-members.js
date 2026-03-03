/**
 * Seed script: Populate golden_members with 15 realistic test records.
 *
 * Data constraints:
 *   - Preferred language: "Hindi" or "English" only.
 *   - Zone: One of the 12 defined zones (aligned with GoldenMemberForm).
 *   - registered_by: First available sewadar_core.id (script exits if none).
 *
 * How to run:
 *   1. Ensure .env.local exists with DATABASE_URL.
 *   2. From project root: node scripts/seed-golden-members.js
 *
 * Optional: Load env explicitly
 *   node -r dotenv/config scripts/seed-golden-members.js dotenv_config_path=.env.local
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

const LANGUAGES = ['Hindi', 'English']

const GENDERS = ['Male', 'Female']

const INDIAN_FIRST_NAMES = [
  'Rajesh', 'Suresh', 'Lata', 'Kavita', 'Vijay', 'Anita', 'Ramesh', 'Sunita',
  'Mohan', 'Padmini', 'Krishna', 'Lakshmi', 'Venkat', 'Saroj', 'Prakash',
]

const INDIAN_LAST_NAMES = [
  'Sharma', 'Kumar', 'Singh', 'Patel', 'Reddy', 'Nair', 'Iyer', 'Gupta',
  'Mehta', 'Desai', 'Pillai', 'Narayan', 'Rao', 'Menon', 'Pandey',
]

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Generate a unique 10-digit Indian mobile number (6–9 prefix). */
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

/** Random date between 1950 and 1975 as YYYY-MM-DD. */
function randomDob() {
  const y = randomInt(1950, 1975)
  const m = randomInt(1, 12)
  const daysInMonth = new Date(y, m, 0).getDate()
  const d = randomInt(1, daysInMonth)
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function slug(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9.]/g, '')
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('Missing DATABASE_URL. Set it in .env.local or the environment.')
    process.exit(1)
  }

  const sql = neon(databaseUrl)

  const sewadars = await sql`SELECT id FROM sewadar_core LIMIT 1`
  if (!sewadars || sewadars.length === 0) {
    console.error('No sewadar found in sewadar_core. Create at least one sewadar (e.g. via Access or onboarding) before seeding golden_members.')
    process.exit(1)
  }
  const registeredBy = sewadars[0].id
  console.log('Using registered_by:', registeredBy)

  const usedPhones = new Set()
  const usedEmails = new Set()
  const members = []

  for (let i = 0; i < 15; i++) {
    const firstName = pick(INDIAN_FIRST_NAMES)
    const lastName = pick(INDIAN_LAST_NAMES)
    const name = `${firstName} ${lastName}`
    const phone = randomPhone(usedPhones)
    let email = `${slug(firstName)}.${slug(lastName)}${i + 1}@gmail.com`
    while (usedEmails.has(email)) {
      email = `${slug(firstName)}.${slug(lastName)}${i + 1}.${randomInt(1, 99)}@gmail.com`
    }
    usedEmails.add(email)

    members.push({
      name,
      phone,
      innergy_email: email,
      gender: pick(GENDERS),
      preferred_language: pick(LANGUAGES),
      dob: randomDob(),
      address: `${randomInt(1, 199)} Block, ${pick(['Sector', 'Colony', 'Nagar'])} ${randomInt(1, 50)}`,
      zone: pick(ZONES),
      center: `Center ${randomInt(1, 5)}`,
      remarks: i % 3 === 0 ? 'Interested in Module 1.' : null,
      registered_by: registeredBy,
    })
  }

  for (const row of members) {
    await sql`
      INSERT INTO golden_members (
        name, phone, innergy_email, gender, preferred_language, dob,
        address, zone, center, remarks, registered_by
      )
      VALUES (
        ${row.name},
        ${row.phone},
        ${row.innergy_email},
        ${row.gender},
        ${row.preferred_language},
        ${row.dob},
        ${row.address},
        ${row.zone},
        ${row.center},
        ${row.remarks},
        ${row.registered_by}
      )
    `
    console.log('Inserted:', row.name, row.phone)
  }

  console.log('Done. Seeded 15 golden members.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
