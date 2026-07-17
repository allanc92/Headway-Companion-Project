import Image from "next/image";
import heroImage from "./hero.png";

export function HeroArt() {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-3xl bg-sand shadow-sm ring-1 ring-line">
      <Image
        src={heroImage}
        alt="A therapist and client seated across from each other in a warm, sunlit room during a calm counseling session"
        fill
        preload
        placeholder="blur"
        sizes="(min-width: 768px) 576px, 100vw"
        className="object-cover"
      />
    </div>
  );
}
