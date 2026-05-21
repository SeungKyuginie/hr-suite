// 로컬 개발용 진입점. Vercel은 api/index.js를 사용.
import { createApp } from './app.js';

const app = createApp({ serveClient: true });
const port = process.env.PORT ?? 4000;
app.listen(port, () => console.log(`[HR] server listening on http://localhost:${port}`));
