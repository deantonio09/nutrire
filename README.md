# Nutrire 🌿
### Asistente de recetas para el embarazo
 
Herramienta web que genera planes de recetas personalizados, seguros y nutricionalmente validados para mujeres embarazadas — desde la semana 1 hasta el nacimiento.
 
---
 
## ¿Qué hace?
 
- Genera recetas adaptadas por **días, personas, comidas y tiempo de preparación**
- Valida automáticamente que todos los ingredientes sean seguros durante el embarazo
- Cubre los tres trimestres con contexto nutricional específico por etapa
- Produce una **lista de compras consolidada** con cantidades exactas
- Filtra preferencias alimentarias reales (vegetariana, sin lactosa, diabetes gestacional, etc.) e ignora entradas inválidas
- Está respaldado por un asistente con perfil de nutricionista clínica especializada en nutrición materno-infantil
 
---
 
## Arquitectura
 
```
GitHub Pages (index.html)
        │
        │ HTTPS + X-Access-Token
        ▼
Vercel Serverless Function (/api/generate.js)
        │  · Valida token de acceso
        │  · Inyecta system prompt experto
        │  · API key nunca expuesta al frontend
        ▼
Claude API (Anthropic)
```
 
- **Frontend**: HTML/CSS/JS estático en GitHub Pages
- **Backend**: Vercel Serverless Function (Node.js)
- **IA**: Claude Sonnet via Anthropic API
- **Seguridad**: token de acceso por URL, API key solo en variables de entorno de Vercel
 
---
 
## Estructura del proyecto
 
```
nutrire/
├── index.html          # Frontend completo (UI + lógica)
├── api/
│   └── generate.js     # Serverless function (proxy + system prompt)
├── vercel.json         # Configuración de rutas Vercel
├── package.json        # Dependencias
├── .gitignore          # Excluye .env y node_modules
└── README.md
```
 
---
 
## Despliegue
 
### Requisitos previos
 
- Cuenta en [GitHub](https://github.com)
- Cuenta en [Vercel](https://vercel.com)
- API key de [Anthropic](https://console.anthropic.com)
 
### 1. Repositorio en GitHub
 
```bash
# Clona o sube los archivos a un repositorio público
# Activa GitHub Pages: Settings → Pages → Branch: main → Save
```
 
Tu frontend quedará en:
```
https://tu-usuario.github.io/nutrire
```
 
### 2. Despliegue en Vercel
 
1. Importa el repositorio en [vercel.com](https://vercel.com)
2. Configura las variables de entorno en **Settings → Environment Variables**:
 
| Variable | Descripción |
|---|---|
| `CLAUDE_API_KEY` | API key de Anthropic (`sk-ant-...`) |
| `ACCESS_TOKEN` | Token secreto para proteger el acceso |
| `ALLOWED_ORIGIN` | URL de GitHub Pages o `*` para pruebas |
| `MAX_QUERIES_GLOBAL` | Límite global de consultas (ej: `50`) |
 
3. Haz **Deploy**
 
### 3. Conectar frontend con backend
 
Edita `index.html` y reemplaza:
 
```js
const API_BASE = 'https://tu-proyecto.vercel.app';
```
 
Con la URL real que te asignó Vercel.
 
### 4. Compartir
 
El link de acceso tiene este formato:
 
```
https://tu-usuario.github.io/nutrire/?token=TU_ACCESS_TOKEN
```
 
Envía ese link a tus usuarios — no necesitan crear cuentas ni instalar nada.
 
---
 
## Seguridad
 
| Capa | Mecanismo |
|---|---|
| Acceso | Token secreto en la URL — sin token, la app muestra pantalla de acceso restringido |
| API key | Solo en variables de entorno de Vercel — nunca en el frontend ni en el repositorio |
| CORS | Configurable por origen via `ALLOWED_ORIGIN` |
| Validación | El prompt se valida en longitud antes de enviarse a Claude |
 
Para revocar el acceso a todos los usuarios: cambia `ACCESS_TOKEN` en Vercel → Redeploy. El link anterior deja de funcionar de inmediato.
 
---
 
## Seguridad alimentaria
 
El asistente sigue estrictamente las guías de la **OMS, ACOG y EFSA** para nutrición en el embarazo:
 
- Lista de alimentos prohibidos (mercurio, crudos, no pasteurizados, etc.)
- Nutrientes prioritarios por trimestre (ácido fólico, hierro, calcio, omega-3)
- Instrucción explícita de no inventar información nutricional
- Verificación de temperaturas de cocción seguras
 
---
 
## Costo estimado
 
| Servicio | Plan gratuito | Costo adicional |
|---|---|---|
| GitHub Pages | Ilimitado | $0 |
| Vercel Functions | 100k invocaciones/mes | ~$0.60/M extra |
| Claude Sonnet | — | ~$0.003 por consulta |
 
Para uso personal o grupo pequeño de prueba: prácticamente $0 en infraestructura.
 
---
 
## Stack
 
- HTML · CSS · JavaScript (vanilla)
- Vercel Serverless Functions (Node.js ESM)
- Claude Sonnet 4 (Anthropic)
- Tipografía: Cormorant Garamond + DM Sans
 
---
 
## Licencia
 
Uso personal y educativo. No apto para reemplazar consulta médica o nutricional profesional.
