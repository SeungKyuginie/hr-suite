// Vercel Serverless Function 진입점.
// 정적 프론트엔드는 vercel.json의 `outputDirectory`(client/dist)가 처리하고,
// `/api/*` 요청만 이 함수가 받아 Express 앱으로 위임한다.
import { createApp } from '../server/app.js';

const app = createApp({ serveClient: false });

export default function handler(req, res) {
  return app(req, res);
}
