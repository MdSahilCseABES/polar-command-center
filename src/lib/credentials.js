/**
 * USER CREDENTIALS
 * ================
 * Hardcoded demo credentials for the prototype. In a real deployment these
 * would come from NCPOR's auth provider or Supabase Auth.
 *
 * Each user has:
 *   id        - a short unique login ID
 *   password  - the password (plaintext — prototype only, never production)
 *   name      - the display name shown in the sidebar
 *   role      - one of the ROLE_KEYS from roles.js
 *
 * IMPORTANT: These are DEMO credentials for a prototype. In production,
 * passwords would be hashed and verified server-side.
 */

export const USERS = [
  /* System Administrators */
  {
    id: 'admin',
    password: 'polar@2025',
    passwords: ['polar@2025', 'admin123', 'polar123', 'admin@2026'],
    name: 'Nikhil Raut',
    role: 'ADMIN',
  },
  {
    id: 'sysadmin',
    password: 'ncpor#admin',
    passwords: ['ncpor#admin', 'admin123', 'polar123'],
    name: 'Vikram Mehta',
    role: 'ADMIN',
  },

  /* Expedition Commanders */
  {
    id: 'commander',
    password: 'expedition@cmd',
    passwords: ['expedition@cmd', 'commander123', 'polar123', 'cmd@2026'],
    name: 'Cdr. Anjali Kulkarni',
    role: 'COMMANDER',
  },
  {
    id: 'cdr.singh',
    password: 'maitri#2025',
    passwords: ['maitri#2025', 'commander123', 'polar123'],
    name: 'Cdr. Rajveer Singh',
    role: 'COMMANDER',
  },

  /* Logistics Officers */
  {
    id: 'logistics',
    password: 'cargo@supply',
    passwords: ['cargo@supply', 'logistics123', 'polar123'],
    name: 'Devendra Joshi',
    role: 'LOGISTICS',
  },
  {
    id: 'stores.khan',
    password: 'bharati#stores',
    passwords: ['bharati#stores', 'logistics123', 'polar123'],
    name: 'Lt. Imran Khan',
    role: 'LOGISTICS',
  },

  /* Field Scientists */
  {
    id: 'scientist',
    password: 'research@field',
    passwords: ['research@field', 'scientist123', 'polar123'],
    name: 'Dr. Farah Siddiqui',
    role: 'SCIENTIST',
  },
  {
    id: 'dr.patel',
    password: 'himadri#lab',
    passwords: ['himadri#lab', 'scientist123', 'polar123'],
    name: 'Dr. Meera Patel',
    role: 'SCIENTIST',
  },
]

/**
 * Validate credentials. Returns the user object if valid, null otherwise.
 */
export function validateCredentials(userId, password) {
  if (!userId || !password) return null
  const trimmedId = userId.trim().toLowerCase()
  const trimmedPass = password.trim()
  return (
    USERS.find(
      (u) =>
        u.id.toLowerCase() === trimmedId &&
        (u.password === trimmedPass ||
          (Array.isArray(u.passwords) && u.passwords.includes(trimmedPass)))
    ) || null
  )
}

/**
 * Get all user IDs grouped by role, for display purposes.
 */
export function getUsersByRole() {
  const grouped = {}
  USERS.forEach((u) => {
    if (!grouped[u.role]) grouped[u.role] = []
    grouped[u.role].push({ id: u.id, name: u.name })
  })
  return grouped
}
