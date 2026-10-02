/** Profile links are derived from attributed original URLs or a reviewed channel mapping. */
export type CreatorProfileSource = { id: string; url: string; platform: string; creator: string };
export type CreatorProfile = { url: string; label: string; platform: string };
const instagramHandle = /^[A-Za-z0-9._]{1,30}$/;
const tiktokHandle = /^[A-Za-z0-9._]{1,24}$/;
const lottieVideos: Record<string, string> = {
  'housing-saadiyat-grace': 'kQox4XkIYwA',
  'food-week-grace': 'zodFLhLH9xE',
};

export function creatorProfile(source: CreatorProfileSource): CreatorProfile | null {
  let original: URL;
  try { original = new URL(source.url); } catch { return null; }
  if (original.protocol !== 'https:' || original.username || original.password || original.port) return null;
  if (source.platform === 'Instagram' && ['instagram.com', 'www.instagram.com'].includes(original.hostname)) {
    const path = original.pathname.match(/^\/([A-Za-z0-9._]+)\/(?:p|reel|reels)\/[A-Za-z0-9_-]+\/?$/);
    const attributed = source.creator.match(/(?:^|\s)@([A-Za-z0-9._]+)(?:$|\s)/);
    if (!path || !attributed || !instagramHandle.test(path[1]) || path[1].toLowerCase() !== attributed[1].toLowerCase()) return null;
    return { url: `https://www.instagram.com/${path[1]}/`, label: source.creator, platform: source.platform };
  }
  if (source.platform === 'TikTok' && ['tiktok.com', 'www.tiktok.com'].includes(original.hostname)) {
    const path = original.pathname.match(/^\/@([A-Za-z0-9._]+)\/video\/\d+\/?$/);
    const attributed = source.creator.match(/^@([A-Za-z0-9._]+)$/);
    if (!path || !attributed || !tiktokHandle.test(path[1]) || path[1].toLowerCase() !== attributed[1].toLowerCase()) return null;
    return { url: `https://www.tiktok.com/@${path[1]}`, label: source.creator, platform: source.platform };
  }
  if (source.platform === 'YouTube' && ['youtube.com', 'www.youtube.com'].includes(original.hostname)
      && source.creator === 'Lottie Grace' && lottieVideos[source.id]
      && original.pathname === '/watch' && original.searchParams.get('v') === lottieVideos[source.id]) {
    return { url: 'https://www.youtube.com/channel/UCBLM4f6isg9jLKW52uhpOHA', label: source.creator, platform: source.platform };
  }
  return null;
}
