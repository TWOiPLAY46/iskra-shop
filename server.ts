import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

interface SearchResultItem {
  url: string;
  thumbnail: string;
  title: string;
  source: string;
}

/**
 * Robust Bing Image Search Scraper
 */
async function searchBingImages(query: string): Promise<SearchResultItem[]> {
  const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&FORM=HDRSC2`;
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7'
    },
    signal: AbortSignal.timeout(6000)
  });

  if (!resp.ok) return [];
  const html = await resp.text();
  const results: SearchResultItem[] = [];
  const seen = new Set<string>();

  // 1. Primary extractor: class="iusc" with JSON m attribute
  const itemRegex = /class=\"iusc\"[^>]*m=\"([^\"]+)\"/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(html)) !== null) {
    try {
      const decoded = match[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const obj = JSON.parse(decoded);
      if (obj.murl && !seen.has(obj.murl)) {
        seen.add(obj.murl);
        results.push({
          url: obj.murl,
          thumbnail: obj.turl || obj.murl,
          title: (obj.t ? obj.t.replace(/<[^>]*>/g, '') : query).trim(),
          source: obj.pub ? obj.pub : 'Інтернет'
        });
      }
    } catch {}
  }

  // 2. Secondary extractor: direct murl regex in html
  if (results.length === 0) {
    const murlRegex = /murl&quot;:&quot;(https?:[^&]+)&quot;.*?turl&quot;:&quot;(https?:[^&]+)&quot;.*?t&quot;:&quot;([^&]*)&quot;/g;
    let m2: RegExpExecArray | null;
    while ((m2 = murlRegex.exec(html)) !== null) {
      try {
        const murl = decodeURIComponent(m2[1]);
        if (!seen.has(murl)) {
          seen.add(murl);
          results.push({
            url: murl,
            thumbnail: decodeURIComponent(m2[2]),
            title: m2[3] ? decodeURIComponent(m2[3]).replace(/<[^>]*>/g, '').trim() : query,
            source: 'Інтернет'
          });
        }
      } catch {}
    }
  }

  return results;
}

/**
 * Fallback DuckDuckGo Image Search
 */
async function searchDuckDuckGoImages(query: string): Promise<SearchResultItem[]> {
  try {
    const tokenResp = await fetch('https://duckduckgo.com/?q=' + encodeURIComponent(query), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'uk-UA,uk;q=0.9,ru;q=0.8,en;q=0.7'
      },
      signal: AbortSignal.timeout(5000)
    });
    const html = await tokenResp.text();
    const match = html.match(/vqd=([0-9-]+)/) || html.match(/vqd=([\"'])(.*?)\1/);
    if (!match) return [];
    const vqd = match[0].replace(/vqd=[\"']?/, '').replace(/[\"']$/, '');
    const imgUrl = `https://duckduckgo.com/i.js?l=wt-wt&o=json&q=${encodeURIComponent(query)}&vqd=${vqd}&f=,,,&p=1`;
    const imgResp = await fetch(imgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });
    if (!imgResp.ok) return [];
    const data = await imgResp.json();
    return (data.results || []).map((r: any) => ({
      url: r.image || r.thumbnail,
      thumbnail: r.thumbnail || r.image,
      title: (r.title || query).replace(/<[^>]*>/g, '').trim(),
      source: r.source || 'Інтернет'
    }));
  } catch {
    return [];
  }
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const isProd = process.env.NODE_ENV === 'production';

  // Security Headers Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Origin, Accept');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '5mb' }));

  // Health check
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // Image search API
  app.get('/api/search-images', async (req: Request, res: Response) => {
    const rawQuery = (req.query.q as string) || '';
    const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '20', 10), 1), 50);

    if (!rawQuery.trim() || rawQuery.length > 200) {
      res.json({ results: [] });
      return;
    }

    const cleanQ = rawQuery
      .replace(/\(.*?\)/g, ' ')
      .replace(/[«»"'`]/g, ' ')
      .replace(/\b(шт|пач|уп|м|компл|од|грн|BLOB)\b\.?/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    try {
      // 1. Try Bing Images (Exact Query)
      let items = await searchBingImages(cleanQ);

      // 2. If < 4 items, try simplified query
      if (items.length < 4) {
        const simplified = cleanQ
          .replace(/\b(TM|ТМ)\b/gi, '')
          .replace(/\b(круг|квадрат|овал|прямокутний)\b/gi, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (simplified && simplified !== cleanQ) {
          const subItems = await searchBingImages(simplified);
          const seen = new Set(items.map((i) => i.url));
          for (const si of subItems) {
            if (!seen.has(si.url)) {
              seen.add(si.url);
              items.push(si);
            }
          }
        }
      }

      // 3. If still empty, try DuckDuckGo
      if (items.length === 0) {
        items = await searchDuckDuckGoImages(cleanQ);
      }

      res.json({ results: items.slice(0, limit) });
    } catch (err: any) {
      console.error('API /api/search-images error:', err?.message || err);
      res.json({ results: [], error: String(err?.message || err) });
    }
  });

  // Helper to validate safe external URLs (SSRF prevention)
  function isSafeExternalUrl(inputUrl: string): boolean {
    try {
      const parsed = new URL(inputUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return false;
      }
      const hostname = parsed.hostname.toLowerCase();
      // Block localhost, private IPs, loopback, metadata services
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname === '169.254.169.254' ||
        hostname.endsWith('.internal') ||
        hostname.endsWith('.local') ||
        /^10\.\d+\.\d+\.\d+$/.test(hostname) ||
        /^192\.168\.\d+\.\d+$/.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  // Image proxy API
  app.get('/api/image-proxy', async (req: Request, res: Response) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl || typeof targetUrl !== 'string') {
      res.status(400).send('Missing or invalid url param');
      return;
    }

    if (!isSafeExternalUrl(targetUrl)) {
      res.status(403).send('Forbidden: invalid or non-allowed target URL');
      return;
    }

    try {
      const fetchResp = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Referer': ''
        },
        signal: AbortSignal.timeout(8000)
      });

      if (!fetchResp.ok) {
        res.status(fetchResp.status).send('Failed to fetch image');
        return;
      }

      const rawContentType = fetchResp.headers.get('content-type') || '';
      // Ensure content type is a valid image or fallback to jpeg
      const isImage = rawContentType.startsWith('image/') || rawContentType.includes('octet-stream');
      const contentType = isImage ? rawContentType.split(';')[0] : 'image/jpeg';

      res.setHeader('Content-Type', contentType);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      const arrayBuf = await fetchResp.arrayBuffer();
      res.send(Buffer.from(arrayBuf));
    } catch (err: any) {
      res.status(500).send('Proxy error: ' + err?.message);
    }
  });

  // AI Product Enrichment API via Gemini 3.8 Flash
  app.post('/api/enrich-product', async (req: Request, res: Response) => {
    try {
      const { name, sku, category, currentDescription, price } = req.body || {};
      if (!name || typeof name !== 'string') {
        res.status(400).json({ error: 'Product name is required' });
        return;
      }

      const cleanCurrentDesc =
        currentDescription &&
        !currentDescription.includes('Товар з облікової програми') &&
        !currentDescription.includes('УкрСклад') &&
        currentDescription.trim().length > 15
          ? currentDescription
          : 'немає (створи новий повноцінний структурований опис українською мовою з нуля, не згадуй жодних облікових програм)';

      const prompt = `Ти — експерт зі збагачення товарних позицій для українського інтернет-магазину сантехніки, електротоварів, інструментів та господарчих товарів "ISKRA".
Сформуй чіткий, професійний та структурований опис товару за стандартом провідних українських інтернет-магазинів (Rozetka, Епіцентр) без зайвої 'води'.

Товар для аналізу:
- Назва: ${name}
- Артикул / Код: ${sku || 'не вказано'}
- Поточна категорія: ${category || 'не визначено'}
- Ціна: ${price ? price + ' грн' : 'не вказано'}
- Поточний опис: ${cleanCurrentDesc}

ЗРАЗОК БАЖАНОГО ОПИСУ:
LED лампа Lebron L-A60-10W - це енергоефективне рішення для вашого освітлення. Завдяки потужності 10 Вт та холодному білому світлу 6500K, вона забезпечує яскраве та комфортне освітлення в будь-якому приміщенні.

Технічні характеристики
Потужність: 10 Вт
Тип цоколя: E27
Світловий потік: 900 Лм
Температура кольору: 6500K
Напруга: 230V

Переваги
Енергоефективність: знижує витрати на електроенергію
Тривалий термін служби: до 25 000 годин

Вимоги:
1. mainCategory: має бути точно одним із варіантів: "Сантехніка та опалення", "Електротовари", "Інструменти та обладнання", "Господарчі товари", "Інше".
2. category: точна назва підкатегорії (наприклад: "Лампи LED", "Світильники", "Розетки та вимикачі", "Змішувачі", "Електроінструмент", "Фітинги та труби" тощо).
3. intro: 1-2 чітких, лаконічних речення про призначення товару та його основну функцію (без 'води').
4. specs: масив із 4-8 головних технічних характеристик з ключами "key" та "value" (наприклад: Потужність -> 10 Вт, Тип цоколя -> E27, Світловий потік -> 900 Лм, Температура кольору -> 6500K, Напруга -> 230V, Гарантія -> 24 міс тощо).
5. features: масив із 2-4 головних переваг у форматі 'Назва переваги: коротке пояснення' (наприклад: ["Енергоефективність: знижує витрати на електроенергію", "Тривалий термін служби: до 25 000 годин"]).
6. description: зібраний текст опису у вказаному зразку: вступний абзац, потім порожній рядок, потім 'Технічні характеристики' і список з нового рядка кожен, потім порожній рядок, потім 'Переваги' і список переваг.
7. tags: 5-8 ключових тегів для внутрішнього пошуку.
8. seoTitle: SEO заголовок до 65 символів.
9. seoDescription: SEO опис до 160 символів.
`;

      const schemaConfig = {
        temperature: 0.1,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mainCategory: { type: Type.STRING },
            category: { type: Type.STRING },
            intro: { type: Type.STRING },
            description: { type: Type.STRING },
            features: { type: Type.ARRAY, items: { type: Type.STRING } },
            specs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  key: { type: Type.STRING },
                  value: { type: Type.STRING }
                },
                required: ['key', 'value']
              }
            },
            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
            seoTitle: { type: Type.STRING },
            seoDescription: { type: Type.STRING }
          },
          required: [
            'mainCategory',
            'category',
            'description',
            'features',
            'specs',
            'tags',
            'seoTitle',
            'seoDescription'
          ]
        }
      };

      const generateWithModel = async (modelName: string) => {
        return await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: schemaConfig
        });
      };

      let response: any;
      try {
        // Attempt primary model gemini-3.8-flash with a 4-second timeout race
        response = await Promise.race([
          generateWithModel('gemini-3.8-flash'),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('gemini-3.8-flash response timeout')), 4000)
          )
        ]);
      } catch (primaryErr: any) {
        console.warn(`[AI Enrich] Primary model gemini-3.8-flash unavailable or busy (${primaryErr?.message || primaryErr}), using fast fallback gemini-3.1-flash-lite...`);
        // Fallback to high-availability gemini-3.1-flash-lite
        response = await generateWithModel('gemini-3.1-flash-lite');
      }

      const rawText = response.text ? response.text.trim() : '{}';
      const cleanJson = rawText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```$/i, '')
        .trim();

      const enriched = JSON.parse(cleanJson);

      // Deterministically assemble description in standard Ukrainian e-commerce format
      const introText = (enriched.intro || '').trim();
      const specItems: Array<{ key: string; value: string }> = Array.isArray(enriched.specs)
        ? enriched.specs.filter((s: any) => s && s.key && s.value)
        : [];
      const featureItems: string[] = Array.isArray(enriched.features)
        ? enriched.features.filter((f: any) => typeof f === 'string' && f.trim().length > 0)
        : [];

      if (introText || specItems.length > 0 || featureItems.length > 0) {
        const parts: string[] = [];
        if (introText) {
          parts.push(introText);
        } else if (enriched.description) {
          const firstPara = enriched.description.split(/\n\s*\n/)[0]?.trim();
          if (firstPara && !firstPara.includes('Технічні характеристики') && !firstPara.includes('Переваги')) {
            parts.push(firstPara);
          }
        }

        if (specItems.length > 0) {
          parts.push('');
          parts.push('Технічні характеристики');
          specItems.forEach((s) => parts.push(`${s.key}: ${s.value}`));
        }

        if (featureItems.length > 0) {
          parts.push('');
          parts.push('Переваги');
          featureItems.forEach((f) => parts.push(f));
        }

        enriched.description = parts.join('\n').trim();
      }

      res.json({ success: true, enriched });
    } catch (err: any) {
      console.error('API /api/enrich-product error:', err?.message || err);
      res.status(500).json({
        error: 'Помилка підключення до Gemini AI: ' + (err?.message || 'сервіс тимчасово недоступний'),
        details: String(err?.message || err)
      });
    }
  });

  // In development, mount Vite middleware
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve dist folder
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${PORT} (mode: ${isProd ? 'production' : 'development'})`);
  });
}

startServer();
