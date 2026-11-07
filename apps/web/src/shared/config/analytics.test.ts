import { describe, expect, it } from "vitest";

import { analyticsUpstream, posthogOptions, stripUrlQueries, toVitalEvent } from "./analytics";

describe("toVitalEvent", () => {
  it("CLS는 소수 셋째 자리까지, 나머지는 밀리초 정수로 보낸다", () => {
    expect(toVitalEvent({ name: "CLS", value: 0.123456, rating: "good" }, "/").value).toBe(0.123);
    expect(toVitalEvent({ name: "LCP", value: 1234.56, rating: "needs-improvement" }, "/").value).toBe(1235);
  });

  it("주소의 쿼리를 빼고 경로만 남기며, 모르는 값은 unknown으로 둔다", () => {
    expect(toVitalEvent({ name: "INP", value: 80 }, "/games?q=전화번호")).toEqual({
      metric: "INP",
      value: 80,
      rating: "unknown",
      navigation_type: "unknown",
      path: "/games",
    });
  });
});

describe("posthogOptions", () => {
  it("사람을 식별하거나 녹화하지 않고, 쿠키를 쓰지 않는다", () => {
    expect(posthogOptions).toMatchObject({
      persistence: "memory",
      person_profiles: "never",
      autocapture: false,
      disable_session_recording: true,
      respect_dnt: true,
      save_campaign_params: false,
      mask_personal_data_properties: true,
    });
  });
});

describe("analyticsUpstream", () => {
  it("PostHog 클라우드면 정적 파일 주소를 지역에 맞춰 고르고, 직접 운영하는 주소는 그대로 쓴다", () => {
    expect(analyticsUpstream("https://eu.i.posthog.com")).toEqual({
      api: "https://eu.i.posthog.com",
      assets: "https://eu-assets.i.posthog.com",
    });
    expect(analyticsUpstream("https://posthog.example.com").assets).toBe("https://posthog.example.com");
    expect(analyticsUpstream("https://us.i.example.com").assets).toBe("https://us.i.example.com");
  });
});

describe("stripUrlQueries", () => {
  it("주소를 담는 속성에서 쿼리와 해시를, 쿼리에서 뽑은 검색어·캠페인 값을 빼고 다른 속성은 그대로 둔다", () => {
    const event = stripUrlQueries({
      event: "$pageview",
      properties: {
        $current_url: "https://avocado.example/games?q=전화번호#top",
        $session_entry_url: "https://avocado.example/?ref=mail",
        $pathname: "/games",
        metric: "LCP",
        ph_keyword: "전화번호",
        $session_entry_ph_keyword: "전화번호",
        utm_term: "보드게임 카페",
        $session_entry_utm_source: "newsletter",
        gclid: "abc",
        gbraid: "g",
        $session_entry_wbraid: "w",
        mc_cid: "m",
      },
      $set_once: { $initial_current_url: "https://avocado.example/?q=x", $initial_utm_campaign: "봄" },
    });
    expect(event?.properties).toEqual({
      $current_url: "https://avocado.example/games",
      $session_entry_url: "https://avocado.example/",
      $pathname: "/games",
      metric: "LCP",
    });
    expect(event?.$set_once).toEqual({ $initial_current_url: "https://avocado.example/" });
    expect(stripUrlQueries(null)).toBeNull();
  });
});

describe("stripUrlQueries 쿼리 키 추적", () => {
  it("주소의 쿼리 키에서 나온 속성은 이름을 몰라도 접두사와 함께 뺀다", () => {
    const event = stripUrlQueries({
      event: "$pageview",
      properties: {
        $current_url: "https://avocado.example/",
        $session_entry_url: "https://avocado.example/?gad_source=전화번호&newcampaign=x",
        $session_entry_gad_source: "전화번호",
        $session_entry_newcampaign: "x",
        newcampaign: "x",
        $browser: "Chrome",
      },
      $set_once: { $initial_newcampaign: "x", $initial_browser: "Chrome" },
    });
    expect(event?.properties).toEqual({
      $current_url: "https://avocado.example/",
      $session_entry_url: "https://avocado.example/",
      $browser: "Chrome",
    });
    expect(event?.$set_once).toEqual({ $initial_browser: "Chrome" });
  });

  it("주소가 함께 오지 않아도 알려진 광고 식별자는 뺀다", () => {
    expect(stripUrlQueries({ properties: { $session_entry_gad_source: "1", gad_campaignid: "2", metric: "LCP" } })?.properties).toEqual({
      metric: "LCP",
    });
  });

  it("SDK가 직접 만든 $ 속성과 수집에 필요한 속성은 쿼리 키와 이름이 같아도 남긴다", () => {
    const event = stripUrlQueries({
      properties: {
        $current_url: "https://avocado.example/?session_id=1&token=2&browser=3",
        $session_id: "s",
        $browser: "Chrome",
        token: "phc_key",
        distinct_id: "d",
        browser: "3",
      },
    });
    expect(event?.properties).toEqual({
      $current_url: "https://avocado.example/",
      $session_id: "s",
      $browser: "Chrome",
      token: "phc_key",
      distinct_id: "d",
    });
  });
});
