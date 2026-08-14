export const BAZAAR_INDEX_URL = 'https://bazaar.b3logfile.com/bazaar/index.json'
export const BAZAAR_OSS_SERVER = 'https://oss.b3logfile.com'
export const BAZAAR_STAGE_BASE = 'https://raw.githubusercontent.com/siyuan-note/bazaar/main/stage'
export const USER_AGENT = 'siyuan-bazaar-stats/1.0 (+https://github.com/TCOTC/siyuan-bazaar-stats)'
export const CDN_BUCKET_SECONDS = 5 * 60

export function bazaarIndexURL(now = Date.now()): string {
  const bucket = Math.floor(now / 1000 / CDN_BUCKET_SECONDS)
  return `${BAZAAR_INDEX_URL}?t=${bucket}`
}

export function packageIconURL(repoWithHash: string): string {
  return `${BAZAAR_OSS_SERVER}/package/${repoWithHash}/icon.png`
}
