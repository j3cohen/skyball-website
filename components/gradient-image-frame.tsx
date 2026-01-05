// components/gradient-image-frame.tsx

import Image from "next/image";
import clsx from "clsx";

type Props = {
  src: string;
  alt: string;
  /** Tailwind aspect class, e.g. "aspect-square" or "aspect-[4/3]" */
  aspectClassName?: string;
  /** Extra classes for the outer frame */
  className?: string;
  /** Extra classes for the <Image> */
  imageClassName?: string;
  /** Add padding so images don't touch edges */
  paddingClassName?: string;
  /** If this is above-the-fold */
  priority?: boolean;
  /** Next/Image sizes */
  sizes?: string;
};

export default function GradientImageFrame({
  src,
  alt,
  aspectClassName = "aspect-[4/3]",
  className,
  imageClassName,
  paddingClassName = "p-4",
  priority = false,
  sizes = "(max-width: 768px) 100vw, 33vw",
}: Props) {
  return (
    <div
      className={clsx(
        "rounded-xl overflow-hidden",
        "bg-gradient-to-b from-[#004aad] to-[#5de0e6]",
        className
      )}
    >
      <div className={clsx("relative w-full", aspectClassName, paddingClassName)}>
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className={clsx("object-contain", imageClassName)}
        />
      </div>
    </div>
  );
}
