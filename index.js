// Express + Socket.IO server for the typing games (prompts + Sudden Death captions)
import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "http"
import { Server } from "socket.io"

dotenv.config()

const app = express()

const FRONT_ORIGIN = process.env.FRONT_ORIGIN || "http://localhost:5173"
const PORT = process.env.PORT || 3001
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY // ここに入れる（.env に設定）

app.use(cors({ origin: FRONT_ORIGIN }))
app.use(express.json())

// Seed prompts (practice mode)
let prompts = [
  { id: 1, text: "猫が好きです", romaji: "nekogasukidesu", difficulty: 320, created_at: new Date().toISOString() },
  { id: 2, text: "明日は雨が降ります", romaji: "asitahaamegafurimasu", difficulty: 550, created_at: new Date().toISOString() },
  { id: 3, text: "車を運転する", romaji: "kurumawounntennsuru", difficulty: 750, created_at: new Date().toISOString() },
  { id: 4, text: "日本語を勉強しています", romaji: "nihonngowobennkyousiteimasu", difficulty: 750, created_at: new Date().toISOString() },
  { id: 5, text: "プログラミングは楽しい", romaji: "puroguraminnguhatanosii", difficulty: 750, created_at: new Date().toISOString() },
  { id: 6, text: "映画を観に行きます", romaji: "eigawominiikimasu", difficulty: 420, created_at: new Date().toISOString() },
  { id: 7, text: "今日は友達と遊びます", romaji: "kyouhatomodatitoasobimasu", difficulty: 750, created_at: new Date().toISOString() },
  { id: 8, text: "美味しいケーキを作る", romaji: "oisiike-kiwotukuru", difficulty: 400, created_at: new Date().toISOString() },
  { id: 9, text: "朝ご飯を食べました", romaji: "asagohannwotabemasita", difficulty: 400, created_at: new Date().toISOString() },
  { id: 10, text: "本を読むのが好きです", romaji: "honnwoyomunogasukidesu", difficulty: 400, created_at: new Date().toISOString() },
  { id: 11, text: "夏休みに旅行したい", romaji: "natuyasuminiryokousitai", difficulty: 465, created_at: new Date().toISOString() },
  { id: 12, text: "キノコよりタケノコ派です", romaji: "kinokoyoritakenokohadesu", difficulty: 465, created_at: new Date().toISOString() },
  { id: 13, text: "今日の晩御飯はハンバーグです", romaji: "kyounobanngohannhahanba-gudesu", difficulty: 465, created_at: new Date().toISOString() },
  { id: 14, text: "好きなスポーツは野球です", romaji: "sukinasupo-tuhayakyuudesu", difficulty: 465, created_at: new Date().toISOString() },
  { id: 15, text: "私は虫が苦手です", romaji: "watasihamusiganigatedesu", difficulty: 465, created_at: new Date().toISOString() },
  { id: 16, text: "友達と旅行に行きます", romaji: "tomodatitoryokouniikimasu", difficulty: 465, created_at: new Date().toISOString() },
  { id: 17, text: "最近は肌寒いですね", romaji: "saikinnhahadazamuidesune", difficulty: 465, created_at: new Date().toISOString() },
  { id: 18, text: "好きな科目は歴史です", romaji: "sukinakamokuharekisidesu", difficulty: 465, created_at: new Date().toISOString() },
  { id: 19, text: "私は料理がすきです", romaji: "watasiharyourigasukidesu", difficulty: 465, created_at: new Date().toISOString() },
  { id: 20, text: "午後から予定があります", romaji: "gogokarayoteigaarimasu", difficulty: 465, created_at: new Date().toISOString() },
  { id: 21, text: "新しい鉛筆を買いたい", romaji: "atarasiiennpituwokaitai", difficulty: 465, created_at: new Date().toISOString() },
  { id: 22, text: "今年の干支はへびです", romaji: "kotosinoetohahebidesu", difficulty: 465, created_at: new Date().toISOString() },
  { id: 23, text: "私はてんびん座です", romaji: "watasihatennbinnzadesu", difficulty: 465, created_at: new Date().toISOString() },
  { id: 24, text: "川でバーベキューをした", romaji: "kawadeba-bekyu-wosita", difficulty: 465, created_at: new Date().toISOString() },
  { id: 25, text: "綺麗なドレスを着た", romaji: "kireinadoresuwokita", difficulty: 465, created_at: new Date().toISOString() },
  { id: 26, text: "家の家事を手伝った", romaji: "ienokajiwotetudatta", difficulty: 465, created_at: new Date().toISOString() },
  { id: 27, text: "アクション映画を見た", romaji: "akushonneigawomita", difficulty: 465, created_at: new Date().toISOString() },
  { id: 28, text: "よろしくお願いします", romaji: "yorosikuonegaisimasu", difficulty: 465, created_at: new Date().toISOString() },
  { id: 29, text: "サイテクカレッジ", romaji: "saitekukarezzi", difficulty: 465, created_at: new Date().toISOString() },
  { id: 30, text: "科学の授業があります", romaji: "kagakunojugyougaarimasu", difficulty: 465, created_at: new Date().toISOString() },
  { id: 31, text: "鉄棒が得意です", romaji: "tetubougatokuidesu", difficulty: 465, created_at: new Date().toISOString() },
  { id: 32, text: "本能寺の変", romaji: "honnnoujinohenn", difficulty: 465, created_at: new Date().toISOString() },
  { id: 33, text: "沖縄県北谷町", romaji: "okinawakenntyatanntyou", difficulty: 465, created_at: new Date().toISOString() },
  { id: 34, text: "近畿地方のとある場所", romaji: "kinnkitihounotoarubasho", difficulty: 465, created_at: new Date().toISOString() },
  { id: 35, text: "叔父にはがきを送る", romaji: "ojinihagakiwookuru", difficulty: 465, created_at: new Date().toISOString() },
  { id: 36, text: "子供の成長ははやい", romaji: "kodomonoseityouhahayai", difficulty: 465, created_at: new Date().toISOString() },
  { id: 37, text: "韓国に移住する", romaji: "kannkokuniijuusuru", difficulty: 465, created_at: new Date().toISOString() },
  { id: 38, text: "ラーメンをすする", romaji: "ra-mennwosusuru", difficulty: 465, created_at: new Date().toISOString() },
  { id: 39, text: "正月に餅つきをした", romaji: "shougatunimotitukiwosita", difficulty: 465, created_at: new Date().toISOString() },
]

// Seed captions for Beat Type Rush (keyed by YouTube videoId)
const suddenDeathCaptions = {
  // 実際のYouTube videoIdに置き換えてください（サウシー「いつか」）
  agQ23NdBROY: [
    { startSec: 23, endSec: 30, text: "坂道を登った先の暗がり 星が綺麗に見えるってさ", romaji: "Sakamichionobottasakinokuragarihoshigakireinimieruttesa" },
    { startSec: 30, endSec: 37, text: "地べたに寝転んじゃう辺り あぁ君らしいなって思ったり", romaji: "Jibetaninekoronjauatariaakimirashiinatteomottari" },
    { startSec: 37, endSec: 44, text: "時間を忘れて夢中になった 赤信号は点滅してる", romaji: "Jikanowasuretemuchuuninattaakashingohatenmetsushiteru" },
    { startSec: 44, endSec: 51, text: "肌寒くなり始めた季節に 僕らは初めて手をつないだ", romaji: "Hadasamukunarihajimetakisetsunibokurawahajimeteteotsunaida" },
    { startSec: 51, endSec: 58, text: "二人の物語", romaji: "Nininomonogatari" },
    { startSec: 58, endSec: 65, text: "ふたりでひとつの傘をさしたり ブランコに乗り星を眺めたり", romaji: "Futaridehitotsunokasaosashitariburankoninorihoshionagametari" },
    { startSec: 65, endSec: 72, text: "押しボタン式の信号機を いつも君が走って押すくだり", romaji: "Oshibotanshikinishingoukiwoitsumokimigahashitteosukudari" },
    { startSec: 72, endSec: 79, text: "仰向けになってみた湖 宙に浮いてるみたいってさ", romaji: "Aomukeninattemitamizuumichuuniuitemitaittesa" },
    { startSec: 79, endSec: 86, text: "はしゃいでる君とその横でさ もっとはしゃぐ僕なら", romaji: "Hashaiderukimitosonoyokodesamottohashagubokunara" },
    { startSec: 86, endSec: 93, text: "本当に飛べるような気がしていた", romaji: "Hontounitoberuyounakigashiteita" },
    { startSec: 93, endSec: 100, text: "ふわふわと夢心地 君の隣", romaji: "Fuwafuwatoyumegokochikiminotonari" },
    { startSec: 100, endSec: 107, text: "君の見る景色を全部 僕のものにしてみたかったんだ", romaji: "Kiminomirukeshikiozenbubokunomononishitemitakattanda" },
    { startSec: 107, endSec: 114, text: "あぁ", romaji: "Aa" },
    { startSec: 114, endSec: 121, text: "君を忘れられんなあ", romaji: "Kimiowasurerarennnaa" },
    { startSec: 121, endSec: 128, text: "当たり前に通ってたあの道 信号機は無くなるみたいです", romaji: "Atarimaenikayottetaanomichishingoukihanakunarumitaidesu" },
    { startSec: 128, endSec: 135, text: "思い出して切なくなる気持ちも いつかは無くなるみたいです", romaji: "Omoidasitesetsunakunarukimochimoitsukahanakunarumitaidesu" },
    { startSec: 135, endSec: 142, text: "そういえば寒い雪降る日の 田和山の無人公園でさ", romaji: "Soiebasamuiyukifuruhinotawayamanomujinkouendesa" },
    { startSec: 142, endSec: 149, text: "震える体 暗い中 いつものように笑い合う 街灯の下で", romaji: "Furuerukaradakuraianakaitsmonoyouniwaraiaugaitounoshitade" },
    { startSec: 149, endSec: 156, text: "僕の目に映り込んだ君が いつもよりちょっと寂しそうな気がした", romaji: "Bokunomeniutsurikondakimigaitsumoyorichottosabishisounakigashita" },
    { startSec: 156, endSec: 163, text: "今になってさ", romaji: "Imaninattesa" },
    { startSec: 163, endSec: 170, text: "思い出してさ", romaji: "Omoidasitesa" },
    { startSec: 170, endSec: 177, text: "後悔じゃなにも解決しないさ", romaji: "Koukaijananimokaiketsushinaisa" },
    { startSec: 177, endSec: 184, text: "忘れられないのは 受け入れられないのは", romaji: "Wasurerarenainohaukeirerarenainoha" },
    { startSec: 184, endSec: 191, text: "君を思い出にできるほど僕は 強くはないから", romaji: "Kimiomoidenidekiruhodobokuhatsuyokuhanaikara" },
    { startSec: 191, endSec: 198, text: "僕の見た景色を全部 君にも見せてやりたかったんだ", romaji: "Bokunomitakeshikiozenbukiminimomiseteyaritakattanda" },
    { startSec: 198, endSec: 205, text: "あったかいココアを一口", romaji: "Attakaikokoaichikuchi" },
  ],
}

const supportedVideoIds = new Set(Object.keys(suddenDeathCaptions))

const buildDefaultCaptions = () =>
  prompts.slice(0, 12).map((p, idx) => ({
    startMs: idx * 4200,
    endMs: idx * 4200 + 3600,
    text: p.text,
    romaji: p.romaji,
  }))

// Health check
app.get("/", (_req, res) => {
  res.send("Typing API server is running. Try GET /api/prompts or /api/sudden-death/captions?videoId=agQ23NdBROY")
})

// GET /api/sudden-death/list : 歌詞付き動画の一覧を返す
app.get("/api/sudden-death/list", (_req, res) => {
  const entries = Object.entries(suddenDeathCaptions).map(([videoId, lines]) => ({
    videoId,
    title: lines[0]?.text || videoId,
    hasLyrics: true,
  }))
  res.json(entries)
})

// GET /api/prompts : get prompt list
app.get("/api/prompts", (_req, res) => {
  const sorted = [...prompts].sort((a, b) => b.id - a.id)
  res.json(sorted)
})

// POST /api/prompts : add prompt
app.post("/api/prompts", (req, res) => {
  try {
    const { text, romaji, difficulty } = req.body || {}
    if (!text || !romaji || difficulty == null) {
      return res.status(400).json({ error: "text, romaji, difficulty are required" })
    }

    const newId = prompts.length > 0 ? Math.max(...prompts.map((p) => p.id)) + 1 : 1
    const newPrompt = {
      id: newId,
      text,
      romaji,
      difficulty,
      created_at: new Date().toISOString(),
    }

    prompts.push(newPrompt)
    res.status(201).json(newPrompt)
  } catch (error) {
    console.error("POST /api/prompts error", error)
    res.status(500).json({ error: "Failed to create prompt" })
  }
})

// GET /api/sudden-death/captions : lyrics with romaji
app.get("/api/sudden-death/captions", async (req, res) => {
  const videoId = (req.query.videoId ?? "").toString().trim()
  if (!videoId) {
    return res.status(400).json({ error: "videoId is required" })
  }

  let lines = []

  // YouTube API が設定されていれば試行（失敗しても seed にフォールバック）
  if (YOUTUBE_API_KEY) {
    try {
      lines = await fetchCaptionsFromYouTube(videoId)
    } catch (err) {
      console.error("YouTube caption fetch failed:", err?.message || err)
    }
  }

  // seed / デフォルトフォールバック
  if (!lines || !lines.length) {
    lines = suddenDeathCaptions[videoId] || suddenDeathCaptions.default || buildDefaultCaptions()
  }

  const normalized = lines.map((line, idx) => {
    // 秒で書きたい場合は startSec/endSec を優先し、msに変換してから扱う
    const fromSeconds = (val, fallback) =>
      typeof val === "number" && Number.isFinite(val) ? val * 1000 : fallback

    let startMs = fromSeconds(line.startSec, typeof line.startMs === "number" ? line.startMs : idx * 4200)
    let endMs = fromSeconds(line.endSec, typeof line.endMs === "number" ? line.endMs : idx * 4200 + 3600)

    // 誤って秒のまま startMs/endMs が渡された場合に備えて桁補正
    const looksLikeSeconds = (ms) => typeof ms === "number" && ms >= 0 && ms < 600
    if (looksLikeSeconds(startMs) && looksLikeSeconds(endMs)) {
      startMs *= 1000
      endMs *= 1000
    }

    return {
      startMs,
      endMs,
      text: line.text,
      romaji: line.romaji,
    }
  })

  res.json(normalized)
})

// GET /api/sudden-death/search : YouTube 動画検索（歌詞は自前入力）
app.get("/api/sudden-death/search", async (req, res) => {
  const query = (req.query.query ?? "").toString().trim()
  if (!query) {
    return res.status(400).json({ error: "query is required" })
  }
  if (!YOUTUBE_API_KEY) {
    return res.status(500).json({ error: "YOUTUBE_API_KEY is not set on server" })
  }
  try {
    const results = await searchYoutubeVideos(query)
    const filtered = results
      .map((v) => ({
        ...v,
        hasLyrics: supportedVideoIds.has(v.videoId),
      }))
      .filter((v) => v.hasLyrics)
    res.json(filtered)
  } catch (err) {
    console.error("YouTube search failed:", err?.message || err)
    res.status(500).json({ error: "Failed to search videos" })
  }
})

// TODO: YouTube から字幕を取得して { startMs, endMs, text, romaji }[] を返す
async function fetchCaptionsFromYouTube(videoId) {
  if (!YOUTUBE_API_KEY) {
    throw new Error("YOUTUBE_API_KEY is not set")
  }
  // ここに YouTube API 呼び出しを実装してください。
  // - Data API v3 の captions エンドポイントはダウンロードに OAuth が必要です。
  // - 別サービスで字幕→ローマ字変換を行う場合は、この関数内で処理して配列を返してください。
  // 現状は未実装のため空配列を返し、seed にフォールバックします。
  return []
}

// YouTube 動画検索（Data API v3 search.list）
async function searchYoutubeVideos(query) {
  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    q: query,
    part: "snippet",
    type: "video",
    maxResults: "10",
  })
  const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) {
    const msg = await res.text().catch(() => "")
    throw new Error(`YouTube search failed: ${res.status} ${msg}`)
  }
  const body = await res.json()
  const items = Array.isArray(body?.items) ? body.items : []
  return items.map((item) => ({
    videoId: item?.id?.videoId,
    title: item?.snippet?.title,
    channelTitle: item?.snippet?.channelTitle,
    publishedAt: item?.snippet?.publishedAt,
    thumbnail: item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || null,
  })).filter((v) => v.videoId)
}

// --- Socket.IO (multiplayer practice) ---

const server = http.createServer(app)

const io = new Server(server, {
  cors: { origin: FRONT_ORIGIN, methods: ["GET", "POST"] },
})

// rooms: Map<roomId, { roomId, isStarted, players }>
const rooms = new Map()

io.on("connection", (socket) => {
  console.log("connected:", socket.id)

  socket.on("create_room", ({ name }, callback) => {
    const roomId = Math.random().toString(36).slice(2, 8)
    const room = { roomId, isStarted: false, players: {} }
    rooms.set(roomId, room)

    room.players[socket.id] = {
      id: socket.id,
      name: name || "NoName",
      score: 0,
      correctCount: 0,
      mistakeCount: 0,
    }

    socket.join(roomId)
    callback?.({ roomId, room })
    io.to(roomId).emit("room_update", room)
  })

  socket.on("join_room", ({ roomId, name }, callback) => {
    const room = rooms.get(roomId)
    if (!room) {
      callback?.({ error: "ルームが見つかりません" })
      return
    }

    room.players[socket.id] = {
      id: socket.id,
      name: name || "NoName",
      score: 0,
      correctCount: 0,
      mistakeCount: 0,
    }

    socket.join(roomId)
    callback?.({ roomId, room })
    io.to(roomId).emit("room_update", room)
  })

  socket.on("start_game", ({ roomId }) => {
    const room = rooms.get(roomId)
    if (!room) return
    room.isStarted = true
    io.to(roomId).emit("game_started")
  })

  socket.on("progress_update", ({ roomId, score, correctCount, mistakeCount }) => {
    const room = rooms.get(roomId)
    if (!room) return
    const player = room.players[socket.id]
    if (!player) return

    if (typeof score === "number") player.score = score
    if (typeof correctCount === "number") player.correctCount = correctCount
    if (typeof mistakeCount === "number") player.mistakeCount = mistakeCount

    io.to(roomId).emit("room_update", room)
  })

  socket.on("disconnect", () => {
    console.log("disconnected:", socket.id)
    for (const [roomId, room] of rooms.entries()) {
      if (room.players[socket.id]) {
        delete room.players[socket.id]
        io.to(roomId).emit("room_update", room)
        if (Object.keys(room.players).length === 0) {
          rooms.delete(roomId)
        }
      }
    }
  })
})

server.listen(PORT, () => {
  console.log(`API + Socket.IO server listening on http://localhost:${PORT} (CORS: ${FRONT_ORIGIN})`)
})


