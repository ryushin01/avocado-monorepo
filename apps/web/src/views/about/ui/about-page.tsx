import { CalendarCheck, Dices, Mail, MonitorSmartphone, Phone } from "lucide-react";

import { buttonVariants } from "@avocado/ui/components/button";
import { Card, CardContent } from "@avocado/ui/components/card";

import { PageHeader } from "@/widgets/site-header";
import { BRAND, FRANCHISE_CONTACT, STORES } from "@/shared/config/site";
import { pageMetadata } from "@/shared/lib/page-metadata";

export const metadata = pageMetadata({
  title: "브랜드 소개",
  description: `${BRAND.name}의 브랜드 소개, 매장 안내, 가맹 문의`,
  path: "/about",
});

const FEATURES = [
  {
    icon: Dices,
    title: "유형별로 고른 게임",
    body: "BoardGameGeek 순위를 참고해 일곱 가지 유형의 게임을 고루 갖췄습니다.",
  },
  {
    icon: MonitorSmartphone,
    title: "키오스크로 쉽게 찾기",
    body: "매장 키오스크에서 게임을 찾아보고 대기도 등록하실 수 있습니다.",
  },
  {
    icon: CalendarCheck,
    title: "예약과 대기 안내",
    body: "방문 전에 예약하실 수 있고, 자리가 차면 대기 순서를 안내해 드립니다.",
  },
];

// 모바일에서 고정 머리글(48px)이 제목을 가리지 않게 한다.
const SECTION = "flex scroll-mt-16 flex-col gap-6 lg:scroll-mt-10";
const CONTACT_LINK = "inline-flex min-h-11 items-center gap-2 underline underline-offset-4";

const telHref = (phone: string) => `tel:${phone}`;

export default function AboutPage() {
  return (
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-8">
      <PageHeader title="ABOUT" back={{ href: "/", label: "홈으로" }} />
      <main id="main" tabIndex={-1} className="min-w-0 scroll-mt-14 lg:col-span-6 lg:scroll-mt-0">
        <div className="flex flex-col gap-16 rounded-lg border border-page bg-card px-5 py-10 text-card-foreground lg:min-h-screen lg:px-[60px] lg:py-[100px]">
          <section className="flex flex-col gap-4">
            <h1 className="text-3xl font-bold text-balance md:text-4xl">{BRAND.tagline}</h1>
            <p className="max-w-2xl tracking-tighter text-muted-foreground">
              {BRAND.name}는 처음 오신 분도, 오래 즐겨 오신 분도 함께 어울릴 수 있는 공간입니다. 오늘 모임에 맞는
              게임을 찾아 편하게 즐겨보세요.
            </p>
            <ul className="mt-4 grid gap-4 md:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="flex flex-col gap-2 rounded-lg border p-5">
                  <Icon aria-hidden className="size-6 text-primary" />
                  <h2 className="font-bold">{title}</h2>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </section>

          <section id="stores" aria-labelledby="stores-title" className={SECTION}>
            <h2 id="stores-title" className="text-2xl font-bold">
              매장 안내
            </h2>
            <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {STORES.map((store) => (
                <li key={store.name}>
                  <Card className="h-full">
                    <CardContent className="flex flex-col gap-3">
                      <h3 className="text-lg font-bold">{store.name}</h3>
                      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 text-sm">
                        <dt className="text-muted-foreground">주소</dt>
                        <dd>{store.address}</dd>
                        <dt className="text-muted-foreground">영업시간</dt>
                        <dd>{store.hours}</dd>
                        <dt className="text-muted-foreground">전화</dt>
                        <dd>
                          <a href={telHref(store.phone)} className={CONTACT_LINK}>
                            {store.phone}
                          </a>
                        </dd>
                      </dl>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </section>

          <section id="franchise" aria-labelledby="franchise-title" className={SECTION}>
            <h2 id="franchise-title" className="text-2xl font-bold">
              가맹 문의
            </h2>
            <p className="max-w-2xl tracking-tighter text-muted-foreground">
              우리 동네에 아보카도를 열고 싶으시다면 연락해 주세요. 상권 검토부터 게임 구성과 매장 운영까지 안내해
              드립니다.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={`mailto:${FRANCHISE_CONTACT.email}`} className={buttonVariants({ className: "h-11 px-5" })}>
                <Mail aria-hidden />
                메일로 문의하기
              </a>
              <a
                href={telHref(FRANCHISE_CONTACT.phone)}
                className={buttonVariants({ variant: "outline", className: "h-11 px-5" })}
              >
                <Phone aria-hidden />
                {FRANCHISE_CONTACT.phone}
              </a>
            </div>
          </section>

          <p className="text-sm text-muted-foreground">
            포트폴리오용 예시 사이트입니다. 매장, 영업시간, 연락처는 모두 가상의 정보입니다.
          </p>
        </div>
      </main>
    </div>
  );
}
