// Reads the last year of public GitHub activity and saves a snapshot to
// scripts/data/activity.json for render.mjs. Usage:
//   GITHUB_TOKEN=... node scripts/refresh-activity.mjs <login>
import { writeFileSync } from "node:fs"
import { profile } from "./data/profile.mjs"

const login = process.argv[2] || profile.handle
const token = process.env.GITHUB_TOKEN
if (!token) { console.error("GITHUB_TOKEN is not set"); process.exit(1) }

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      restrictedContributionsCount
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
      commitContributionsByRepository(maxRepositories: 10) {
        repository { name nameWithOwner isPrivate }
        contributions { totalCount }
      }
    }
  }
}`

const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": "profile-readme" },
    body: JSON.stringify({ query, variables: { login } })
})
const json = await res.json()
if (!res.ok || json.errors) { console.error(JSON.stringify(json.errors ?? json)); process.exit(1) }

const c = json.data.user.contributionsCollection
const hide = new Set(profile.activity.hide)
const snapshot = {
    updated: new Date().toISOString().slice(0, 10),
    total: c.contributionCalendar.totalContributions,
    private: c.restrictedContributionsCount,
    days: c.contributionCalendar.weeks.flatMap((w) => w.contributionDays.map((d) => [d.date, d.contributionCount])),
    // Private repositories stay anonymous: only public names are kept
    repos: c.commitContributionsByRepository
        .filter((x) => !x.repository.isPrivate && !hide.has(x.repository.nameWithOwner))
        .map((x) => ({ name: x.repository.name, count: x.contributions.totalCount }))
        .slice(0, 4)
}
writeFileSync(new URL("./data/activity.json", import.meta.url), JSON.stringify(snapshot))
console.log(`activity: ${snapshot.total} contributions, ${snapshot.days.length} days, ${snapshot.repos.length} repos`)
