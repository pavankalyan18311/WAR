// Instagram's embed page shows a ~56px profile header, then the reel in a 4:5 box (the 9:16 video
// centred inside it), then likes/caption. Zooming by ~1.45 from the top makes the video fill a 9:16 card;
// the parent (overflow-hidden) crops the header and footer away.
const HEADER_PX = 56;
const ZOOM = 1.45;

/** Instagram's official reel player, cropped to fill its 9:16 parent. Plays when tapped. */
export default function InstagramEmbed({ src, title }: { src: string; title: string }) {
  return (
    <iframe src={src} title={title} loading="lazy" scrolling="no"
      allow="autoplay; encrypted-media; picture-in-picture"
      className="absolute top-0 left-0 w-full border-0"
      style={{ height: 1200, transformOrigin: 'top center', transform: `translateY(-${HEADER_PX * ZOOM}px) scale(${ZOOM})` }} />
  );
}
