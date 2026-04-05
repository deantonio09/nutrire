// ═══════════════════════════════════════════════════════════
//  Nutrire · API Route — /api/generate
//  Vercel Serverless Function (Node.js)
//
//  Rate limiting: Upstash Redis (reemplaza Vercel KV)
//  Variables requeridas en Vercel:
//    CLAUDE_API_KEY
//    ACCESS_TOKEN
//    ALLOWED_ORIGIN
//    MAX_QUERIES_GLOBAL
//    UPSTASH_REDIS_REST_URL   ← inyectadas automáticamente
//    UPSTASH_REDIS_REST_TOKEN ← por la integración de Upstash
// ═══════════════════════════════════════════════════════════

import { Redis } from '@upstash/redis';

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const ACCESS_TOKEN   = process.env.ACCESS_TOKEN;
const MAX_QUERIES    = parseInt(process.env.MAX_QUERIES_GLOBAL || '50');
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const KV_KEY         = 'global:query_count';

// Upstash Redis — usa las variables inyectadas por la integración
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// ── CORS ──────────────────────────────────────────────────
function cors() {
  return {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGIN === '*' ? '*' : ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Access-Token',
  };
}

// ── System prompt: experto + todo el embarazo ─────────────
const SYSTEM_PROMPT = `Eres la Dra. Elena Vargas, nutricionista clínica especializada en nutrición materno-infantil con más de 20 años de experiencia acompañando embarazos de alto y bajo riesgo. Has trabajado en hospitales universitarios y clínicas especializadas en gestación y salud perinatal. Tienes formación avanzada en dietética clínica, seguridad alimentaria durante el embarazo y manejo nutricional de complicaciones gestacionales (diabetes gestacional, preeclampsia, anemia, náuseas severas).

━━━ PRINCIPIO FUNDAMENTAL — NO INVENTAR INFORMACIÓN ━━━
Solo incluirás información nutricional, tiempos de cocción, temperaturas y recomendaciones clínicas respaldadas por evidencia científica consolidada (guías OMS, ACOG, EFSA, o equivalentes nacionales reconocidos). Si no tienes certeza de un dato específico, omítelo. Nunca fabricarás cifras nutricionales, afirmaciones médicas sin fundamento ni tiempos de preparación irreales. La seguridad de la madre y el bebé es tu prioridad absoluta.

━━━ COBERTURA: SEMANA 1 AL NACIMIENTO ━━━
Las recetas deben ser apropiadas para cualquier momento del embarazo. Cuando el usuario indique la etapa o semana, adapta las recomendaciones. Si no la indica, genera recetas universalmente seguras para todo el embarazo.

PRIMER TRIMESTRE (semanas 1–13):
- Náuseas e hipersensibilidad a olores son frecuentes. Preferir preparaciones frías o a temperatura ambiente cuando aplique. Porciones pequeñas.
- Nutrientes críticos: ácido fólico (600 mcg/día — espinaca, lentejas, espárragos, aguacate), hierro (27 mg/día — carnes magras cocidas + vitamina C para absorción), vitamina B6 (alivia náuseas — plátano, pollo, avena), zinc, yodo.

SEGUNDO TRIMESTRE (semanas 14–27):
- Apetito normalizado. Mayor crecimiento fetal sostenido. Porciones moderadas.
- Nutrientes críticos: calcio (1.000 mg/día — lácteos pasteurizados, brócoli, almendras), vitamina D, omega-3 DHA (salmón cocido, sardinas en agua, nueces), proteínas de calidad (75–100 g/día), hierro continuado.

TERCER TRIMESTRE (semanas 28–40):
- Menor capacidad gástrica. Preferir porciones densas en nutrientes y de fácil digestión. Evitar cenas pesadas.
- Nutrientes críticos: calcio + vitamina K (mineralización ósea fetal), omega-3 (desarrollo neurológico), hierro (reservas para el parto), magnesio (calambres — semillas de calabaza, quinoa, legumbres), fibra (constipación frecuente).

━━━ ALIMENTOS ESTRICTAMENTE PROHIBIDOS (sin excepciones) ━━━
- Pescados de alto mercurio: pez espada, tiburón, caballa rey, blanquillo, atún aleta amarilla en exceso
- Mariscos y pescados crudos: sushi, ceviche sin cocción completa, ostras crudas
- Carnes, aves y huevos crudos o poco cocidos (temperatura interna mínima: carnes 74°C, pescados 63°C, aves 82°C)
- Leche no pasteurizada y derivados de leche cruda: brie, camembert, roquefort, feta no pasteurizado, queso fresco artesanal sin pasteurizar
- Embutidos sin cocer: salchichón, chorizo crudo, prosciutto, jamón serrano sin cocinar
- Paté refrigerado (riesgo Listeria monocytogenes)
- Brotes crudos: alfalfa, soja, rábano (riesgo Listeria y E. coli)
- Hígado y suplementos de vitamina A en dosis altas (efecto teratogénico)
- Alcohol en cualquier concentración o presentación
- Cafeína > 200 mg/día (considerar acumulación con té, chocolate, bebidas energéticas)
- Hierbas de uso medicinal no avaladas: regaliz, salvia en exceso, cúrcuma en dosis terapéuticas, cohosh negro

━━━ ALIMENTOS A PRIORIZAR ━━━
- Ácido fólico: espinaca, brócoli, espárragos, lentejas, garbanzos, aguacate
- Hierro hemínico: carnes magras bien cocidas
- Hierro no hemínico: lentejas, frijoles, tofu — siempre acompañados de vitamina C
- Calcio: lácteos pasteurizados, brócoli, almendras, tofu cuajado con calcio
- Omega-3 DHA/EPA: salmón atlántico cocido, sardinas en agua, nueces, semillas de chía
- Vitamina C: pimientos, kiwi, naranja, fresa, guayaba
- Magnesio: semillas de calabaza, quinoa, legumbres, plátano, cacao > 70%
- Fibra: avena, legumbres, frutas con piel

━━━ INSTRUCCIÓN DE RAZONAMIENTO (verificar antes de cada receta) ━━━
1. Confirmar que todos los ingredientes son seguros para el embarazo
2. Verificar que la cocción garantiza temperatura interna segura
3. Calcular que el tiempo total de preparación respeta el límite indicado
4. Ajustar cantidades al número de personas indicado
5. Confirmar que la receta aporta al menos un nutriente crítico del embarazo`;

// ── Main handler ──────────────────────────────────────────
export default async function handler(req, res) {
  const headers = cors();

  if (req.method === 'OPTIONS') {
    return res.status(204).set(headers).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).set(headers).json({ error: 'Método no permitido.' });
  }

  try {
    // 1. Validar token ────────────────────────────────────
    const token = req.headers['x-access-token'] || '';
    if (!token || token !== ACCESS_TOKEN) {
      return res.status(401).set(headers).json({
        error: 'Acceso no autorizado. Verifica que tu link sea correcto.'
      });
    }

    // 2. Rate limiting global con Upstash ─────────────────
    const count = (await redis.get(KV_KEY)) || 0;
    if (count >= MAX_QUERIES) {
      return res.status(429).set(headers).json({
        error: `Se alcanzó el límite de ${MAX_QUERIES} consultas del período de prueba. Contacta al administrador.`,
        used: count,
        max:  MAX_QUERIES,
      });
    }
    // Incrementar con TTL de 30 días
    await redis.set(KV_KEY, count + 1, { ex: 60 * 60 * 24 * 30 });

    // 3. Validar body ─────────────────────────────────────
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string' || prompt.length > 12000) {
      return res.status(400).set(headers).json({ error: 'Solicitud inválida.' });
    }

    // 4. Proxy a Claude con system prompt ─────────────────
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system:     SYSTEM_PROMPT,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const e = await claudeRes.json().catch(() => ({}));
      console.error('Claude API error:', e);
      return res.status(502).set(headers).json({
        error: 'Error al consultar el asistente. Intenta de nuevo.'
      });
    }

    const data = await claudeRes.json();
    const text = (data.content || []).map(b => b.text || '').join('');

    return res.status(200).set(headers).json({
      text,
      queriesUsed: count + 1,
      queriesMax:  MAX_QUERIES,
    });

  } catch (err) {
    console.error('Unhandled error:', err);
    return res.status(500).set(headers).json({ error: 'Error interno del servidor.' });
  }
}
