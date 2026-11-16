"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

/**
 * 화면이 보이는 동안 intervalMs마다 서버 데이터를 다시 받는다(router.refresh).
 * 탭이 숨으면 멈추고, 다시 보이면 바로 한 번 받은 뒤 이어 간다.
 * 서버 컴포넌트만 다시 그리므로 열린 대화상자·입력 중인 값 같은 화면 상태는 그대로 남는다.
 */
export function useAutoRefresh(intervalMs: number) {
  const router = useRouter()

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined
    const stop = () => {
      clearInterval(timer)
      timer = undefined
    }
    const start = () => {
      stop()
      timer = setInterval(() => router.refresh(), intervalMs)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return stop()
      router.refresh()
      start()
    }

    if (document.visibilityState === "visible") start()
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      stop()
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [router, intervalMs])
}
