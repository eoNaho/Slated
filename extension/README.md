# PixelReel — Browser Extension

Extensão de navegador (Manifest V3) que rastreia o que você está assistindo no **Netflix**, **Prime Video** e **Disney+** e sincroniza com seu perfil no PixelReel.

## Estrutura

```
extension/
├── manifest.json              # Manifest V3
├── background/
│   └── service-worker.js      # Alarmes, heartbeats, recebe mensagens dos content scripts
├── content/
│   ├── netflix.js             # Scraper para netflix.com
│   ├── prime.js               # Scraper para primevideo.com
│   └── disney.js              # Scraper para disneyplus.com
├── popup/
│   ├── popup.html             # UI da extensão
│   ├── popup.css              # Estilo
│   └── popup.js               # Lógica: token, toggle, status ao vivo
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## Como instalar no Chrome (desenvolvimento)

1. Abra `chrome://extensions`
2. Ative o **Modo desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `extension/`

## Como usar

1. Acesse seu perfil no PixelReel → **Configurações → Tokens de API**
2. Crie um novo token com o nome "Extensão Chrome"
3. Copie o token gerado (aparece apenas uma vez)
4. Clique no ícone da extensão → cole o token → clique em **Salvar**
5. Abra Netflix, Prime Video ou Disney+ e comece a assistir
6. Seu perfil no PixelReel atualiza automaticamente! 🎬

## Como funciona

```
Você assiste um vídeo
  → content script lê título, progresso e status do DOM
  → envia para o service worker via chrome.runtime.sendMessage()
  → service worker faz PATCH /api/v1/activity com o token
  → API atualiza current_activity no banco
  → ao atingir 80% de progresso + status "finished" → scrobble automático criado
```

## Heartbeat

O service worker usa `chrome.alarms` para checar a cada **30 segundos** (limite mínimo do MV3 = 0.5 min). O content script também envia um update imediato sempre que detecta mudança de título ou status.

## Privacidade

A extensão **nunca modifica** o player das plataformas — apenas lê o DOM pasivamente. Equivalente a o usuário copiar o nome do filme manualmente. Zero risco de violação de ToS relevante.

## Seletores de DOM

Os seletores CSS de cada plataforma podem quebrar quando as plataformas atualizam o HTML. Para atualizar:
- Netflix → `content/netflix.js`
- Prime Video → `content/prime.js`
- Disney+ → `content/disney.js`
