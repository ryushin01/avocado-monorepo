import type { Metadata } from "next";

import { BRAND, SHARE_IMAGE } from "@/shared/config/site";

/** 화면별 제목·설명·대표 주소·공유 정보. openGraph는 부모 값과 합쳐지지 않고 통째로 바뀌므로 공통 값도 함께 적는다. */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: BRAND.name,
      title: `${title} | ${BRAND.name}`,
      description,
      url: path,
      images: [SHARE_IMAGE],
    },
  };
}
