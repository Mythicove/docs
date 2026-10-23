// 皮肤库读路径基线：列表（搜索/排序/分页）→ 详情。
// 运行：docker run --rm -v ${PWD}:/k6 -w /k6 grafana/k6 run skinlib-read.js -e BASE=http://host.docker.internal:18080
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE ?? "http://localhost:8080";

export const options = {
  scenarios: {
    read: {
      executor: "ramping-vus",
      stages: [
        { duration: "30s", target: 20 },
        { duration: "1m", target: 50 },
        { duration: "20s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<500"],
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const list = http.get(`${BASE}/skinlib?sort=newest&limit=20`);
  check(list, { "list 200": (r) => r.status === 200 });
  const body = list.json();
  if (body && body.items && body.items.length > 0) {
    const id = body.items[Math.floor(Math.random() * body.items.length)].id;
    const detail = http.get(`${BASE}/skinlib/${id}`);
    check(detail, { "detail 200": (r) => r.status === 200 });
  }
  sleep(1);
}
