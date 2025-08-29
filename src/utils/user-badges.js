const LS_REVIEWS = 'ne_reviews'
const LS_FAVS = 'ne_favs'

export function loadBadges(email) {
  if (!email) return []
  let list = []

  const reviews = JSON.parse(localStorage.getItem(LS_REVIEWS) || '{}')
  const favs = JSON.parse(localStorage.getItem(LS_FAVS) || '[]')

  const myReviews = Object.values(reviews)
    .flat()
    .filter((r) => (r?.name === undefined ? false : true))
  if (myReviews.length >= 5) list.push('Contributor Lv1')
  if (myReviews.length >= 15) list.push('Top Reviewer')

  if (Array.isArray(favs) && favs.length >= 5) list.push('Food Explorer')
  return list
}
