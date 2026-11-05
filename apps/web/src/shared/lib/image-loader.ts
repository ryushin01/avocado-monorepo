const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * GitHub Pages용 정적 빌드의 이미지 주소. 이미지 최적화 서버가 없으므로 원본을 그대로 쓰고,
 * 저장소 하위 경로에 올라가므로 사이트 안의 파일에는 그 경로를 붙인다.
 */
export default function staticImageLoader({ src }: { src: string; width: number; quality?: number }): string {
  return src.startsWith("/") ? `${BASE_PATH}${src}` : src;
}
