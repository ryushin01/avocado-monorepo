import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// 전역 API(globals)를 쓰지 않으므로 Testing Library가 자동으로 정리하지 못한다.
afterEach(cleanup);
