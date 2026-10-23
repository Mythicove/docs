// 写路径基线：注册+邮箱验证（setup 播种）→ 登录 → 上传皮肤 → 发布到皮肤库。
// 依赖 mailpit 收验证邮件（MAILPIT 环境变量）。
// 运行：docker run --rm -v ${PWD}:/k6 -w /k6 grafana/k6 run upload-write.js \
//   -e BASE=http://host.docker.internal:18080 -e MAILPIT=http://host.docker.internal:8025
import http from "k6/http";
import { check, sleep } from "k6";

const BASE = __ENV.BASE ?? "http://localhost:8080";
const MAILPIT = __ENV.MAILPIT ?? "http://localhost:8025";
const PASSWORD = "loadtest-password-123";
const JSON_HEADERS = { headers: { "Content-Type": "application/json" } };

// 二进制皮肤（64x64 PNG，与本脚本同目录挂载）。
const SKIN_PNG = open("./skin.png", "b");

export function setup() {
  const users = [];
  const n = Number(__ENV.USERS ?? 5);
  const stamp = Date.now();
  for (let i = 0; i < n; i++) {
    const email = `load-${stamp}-${i}@example.com`;
    const playerName = `Ld${stamp.toString().slice(-8)}${i}`;
    const reg = http.post(
      `${BASE}/account/register`,
      JSON.stringify({ email, password: PASSWORD, playerName }),
      JSON_HEADERS,
    );
    if (reg.status !== 201) continue;
    // 轮询 mailpit 取验证 token
    let token = "";
    for (let attempt = 0; attempt < 30 && !token; attempt++) {
      const msgs = http.get(`${MAILPIT}/api/v1/search?query=to:${email}`).json("messages");
      if (msgs && msgs.length > 0) {
        const text = http.get(`${MAILPIT}/api/v1/message/${msgs[0].ID}`).json("Text") ?? "";
        const m = /token=([a-f0-9]+)/.exec(text);
        if (m) token = m[1];
      }
      sleep(0.5);
    }
    if (!token) continue;
    http.post(`${BASE}/account/verify`, JSON.stringify({ token }), JSON_HEADERS);
    users.push({ email, playerName });
  }
  if (users.length === 0) throw new Error("no load-test users seeded");
  return { users };
}

export const options = {
  scenarios: {
    write: {
      executor: "constant-vus",
      vus: 5,
      duration: "1m",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<1500"],
    http_req_failed: ["rate<0.02"],
    // 业务检查通过率
    checks: ["rate>0.95"],
  },
};

export default function (data) {
  const user = data.users[Math.floor(Math.random() * data.users.length)];

  const auth = http.post(
    `${BASE}/authserver/authenticate`,
    JSON.stringify({ username: user.email, password: PASSWORD }),
    JSON_HEADERS,
  );
  const okAuth = check(auth, { "auth 200": (r) => r.status === 200 });
  if (!okAuth) return;
  const token = auth.json("accessToken");
  const bearer = { headers: { Authorization: `Bearer ${token}` } };

  const up = http.post(`${BASE}/skin/${user.playerName}?model=default`, SKIN_PNG, bearer);
  check(up, { "upload 204": (r) => r.status === 204 });

  const pub = http.post(
    `${BASE}/skinlib`,
    JSON.stringify({ playerName: user.playerName, description: `load-${Date.now()}` }),
    { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } },
  );
  check(pub, { "publish 201": (r) => r.status === 201 });
  sleep(1);
}
