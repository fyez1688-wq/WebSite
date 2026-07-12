import Image, { type ImageProps } from "next/image";

function isRemoteSource(src: ImageProps["src"]) {
  return typeof src === "string" && /^https?:\/\//i.test(src);
}

export function PublicImage({ src, alt, unoptimized, ...props }: ImageProps) {
  return <Image {...props} src={src} alt={alt} unoptimized={unoptimized ?? isRemoteSource(src)} />;
}
