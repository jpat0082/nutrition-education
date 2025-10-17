const LS_REVIEWS = 'ne_reviews'
const LS_FAVS = 'ne_favs'
const LS_USER_BADGES = 'ph_user_badges'

function safeParse(text, fallback) {
  try {
    return JSON.parse(text ?? '') ?? fallback
  } catch {
    return fallback
  }
}

export function loadBadges(email) {
  const e = String(email || '')
    .toLowerCase()
    .trim()
  if (!e) return []

  const out = []

  const userMap = safeParse(localStorage.getItem(LS_USER_BADGES), {})
  if (Array.isArray(userMap[e])) {
    for (const b of userMap[e]) if (b) out.push(String(b))
  }

  const reviewsObj = safeParse(localStorage.getItem(LS_REVIEWS), {})
  const favsArr = safeParse(localStorage.getItem(LS_FAVS), [])

  const allReviews = Object.values(reviewsObj).flat().filter(Boolean)

  const myReviews = allReviews.filter((r) => {
    if (r?.email) return String(r.email).toLowerCase().trim() === e
    return r?.name !== undefined
  })

  if (myReviews.length >= 5) out.push('Contributor Lv1')
  if (myReviews.length >= 15) out.push('Top Reviewer')

  if (Array.isArray(favsArr) && favsArr.length >= 5) out.push('Food Explorer')

  return Array.from(new Set(out))
}
