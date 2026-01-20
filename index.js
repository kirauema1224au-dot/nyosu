// Express + Socket.IO server for the typing games (prompts + Sudden Death captions)
import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import http from "http"
import { Server } from "socket.io"

dotenv.config()

const app = express()

const FRONT_ORIGINS = (process.env.FRONT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
const PORT = process.env.PORT || 3001
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY // ここに入れる（.env に設定）

app.use(cors({ origin: FRONT_ORIGINS }))
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
    { startSec: 24, endSec: 31, text: "坂道を登った先の暗がり 星が綺麗に見えるってさ", romaji: "sakamitiwonobottasakinokuragarihosigakireinimieruttesa" },
    { startSec: 31, endSec: 36, text: "地べたに寝転んじゃう辺り あぁ君らしいなって思ったり", romaji: "zibetaninekoronnjauatariaxakimirasiinatteomottari" },
    { startSec: 36, endSec: 43, text: "時間を忘れて夢中になった 赤信号は点滅してる", romaji: "zikanwowasuretemutyuuninattaakasinngouhatennmetusiteiru" },
    { startSec: 42, endSec: 49, text: "肌寒くなり始めた季節に 僕らは初めて手をつないだ", romaji: "hadazamukunarihazimetakisetunibokurahahazimetetewotunaida" },
    { startSec: 49, endSec: 54, text: "二人の物語", romaji: "hutarinomonogatari" },
    { startSec: 54, endSec: 60, text: "ふたりでひとつの傘をさしたり ブランコに乗り星を眺めたり", romaji: "hutaridehitunokasawosasitariburannkoninorihosiwonagametari" },
    { startSec: 60, endSec: 66, text: "押しボタン式の信号機を いつも君が走って押すくだり", romaji: "osibotannsikinosinngoukiwoitumokimigahasitteosukudari" },
    { startSec: 66, endSec: 73, text: "仰向けになってみた湖 宙に浮いてるみたいってさ", romaji: "aomukeninattemitamizuumityuuniuiterumitaittesa" },
    { startSec: 73, endSec: 79, text: "はしゃいでる君とその横でさ もっとはしゃぐ僕なら", romaji: "hasyaideirukimitosonoyokodesamottohasyagubokunara" },
    { startSec: 79, endSec: 85, text: "本当に飛べるような気がしていた", romaji: "honntounitoberuyounakigasiteita" },
    { startSec: 85, endSec: 93, text: "ふわふわと夢心地 君の隣", romaji: "huwahuwatoyumegokotikiminotonari" },
    { startSec: 93, endSec: 107, text: "君の見る景色を全部 僕のものにしてみたかったんだ", romaji: "kiminomirukesikiwozennbubokunomononisitemitakattannda" },
    { startSec: 107, endSec: 129, text: "君を忘れられんなあ", romaji: "kimiwowasurerarennna" },
    { startSec: 129, endSec: 136, text: "当たり前に通ってたあの道 信号機は無くなるみたいです", romaji: "atarimaenikayottetaanomitisinngoukihanakunarumitaidesu" },
    { startSec: 136, endSec: 141, text: "思い出して切なくなる気持ちも いつかは無くなるみたいです", romaji: "omoidasitesetunakunarukimotimoitukahanakunarumitaidesu" },
    { startSec: 141, endSec: 147, text: "そういえば寒い雪降る日の 田和山の無人公園でさ", romaji: "souiebasamuiyukihuruhinotawayamanomuzinnkouenndesa" },
    { startSec: 147, endSec: 156, text: "震える体 暗い中 いつものように笑い合う 街灯の下で", romaji: "furuerukaradakurainakaitumonoyouniwaraiaugaitounositade" },
    { startSec: 156, endSec: 170, text: "僕の目に映り込んだ君が いつもよりちょっと寂しそうな気がした", romaji: "bokunomeniuturikonndakimigaitumoyorityottosabisisounakigasita" },
    { startSec: 170, endSec: 183, text: "今になってさ 思い出してさ 後悔じゃなにも解決しないさ", romaji: "imaninattesaomoidasitesakoukaizyananimokaiketusinaisa" },
    { startSec: 183, endSec: 189, text: "忘れられないのは 受け入れられないのは", romaji: "wasurerarenainohaukeirerarenainoha" },
    { startSec: 189, endSec: 199, text: "君を思い出にできるほど僕は 強くはないから", romaji: "kimiwoomoidenidekiruhodobokuhatuyokunaikara" },
    { startSec: 199, endSec: 212, text: "僕の見た景色を全部 君にも見せてやりたかったんだ", romaji: "bokunomitakesikiwozennbukiminimomiseteyaritakattannda" },
    { startSec: 212, endSec: 217, text: "あったかいココアを一口", romaji: "attkaikokoawohitokuti" },
    { startSec: 217, endSec: 230, text: "いつかまた逢う日までと 笑う顔に嘘は見当たらない", romaji: "itukamataauhimadetowaraukaoniuwohamiataranai" },
    { startSec: 230, endSec: 241, text: "じゃあね じゃあね またどっか遠くで", romaji: "zyaanezyaanemtadokkatookude" },
    { startSec: 241, endSec: 279, text: "いつか", romaji: "itsuka" },
  ],

  "YO-rXgQKlF8": [
    { startSec: 17, endSec: 24, text: "この風は どこからきたのと", romaji: "konokazehadokokarakitanoto" },
    { startSec: 24, endSec: 31, text: "問いかけても 空は何も言わない", romaji: "toikaketemosorahananimoiwanai" },
    { startSec: 31, endSec: 38, text: "この歌は どこへ辿り着くの", romaji: "konoutahadokohetadoritukuno" },
    { startSec: 38, endSec: 45, text: "見つけたいよ 自分だけの答えを", romaji: "mituketaiyozibunndakenokotaewo" },
    { startSec: 45, endSec: 56, text: "まだ知らない海の果てへと 漕ぎ出そう", romaji: "madasiranaiuminohatehetokogidasou" },
    { startSec: 56, endSec: 68, text: "ただひとつの夢 決して譲れない", romaji: "tadahitotunoyumekesiteyuzurenai" },
    { startSec: 68, endSec: 77, text: "心に帆を揚げて 願いのまま進め", romaji: "kokoronihowoagetenegainomamasusume" },
    { startSec: 77, endSec: 89, text: "いつだって あなたへ 届くように 歌うわ", romaji: "itudatteanatahetodokuyouniutauwa" },
    { startSec: 89, endSec: 102, text: "大海原を駆ける 新しい風になれ", romaji: "oounabarawokakeruatarasiikazeninare" },
    { startSec: 102, endSec: 110, text: "それぞれに 幸せを目指し", romaji: "sorezorenisiawasewomezasi" },
    { startSec: 110, endSec: 117, text: "傷ついても それでも 手を伸ばすよ", romaji: "kizutuitemosoredemotewonobasuyo" },
    { startSec: 117, endSec: 124, text: "悲しみも強さに変わるなら", romaji: "kanasimimotuyosanikawarunara" },
    { startSec: 124, endSec: 130, text: "荒れ狂う嵐も越えていけるはず", romaji: "arekuruuarasimokoeteikeruhazu" },
    { startSec: 130, endSec: 142, text: "信じるその旅の果てで また 会いたい", romaji: "sinnzirusnotabinohatedemataaitai" },
    { startSec: 142, endSec: 154, text: "目覚めたまま見る夢 決して醒めはしない", romaji: "mezametamamamiruyumekesitesamehasinai" },
    { startSec: 154, endSec: 164, text: "水平線の彼方 その影に手を振るよ", romaji: "suiheisennnokanatasonokagenitewohuruyo" },
    { startSec: 164, endSec: 174, text: "いつまでも あなたへ 届くように 歌うわ", romaji: "itumademoanatahetodokuyouniutauwa" },
    { startSec: 174, endSec: 210, text: "大きく広げた帆が 纏う 青い風になれ", romaji: "ookikuhirogetahogamatouaoikazeninare" },
    { startSec: 210, endSec: 222, text: "ただひとつの夢 誰も奪えない", romaji: "tadahitotunoyumedaremoubaenai" },
    { startSec: 222, endSec: 231, text: "私が消え去っても 歌は響き続ける", romaji: "watasigakiesattemoutahahibikitudukeru" },
    { startSec: 231, endSec: 243, text: "どこまでも あなたへ 届くように 歌うわ", romaji: "dokomademoanatahetodokuyouniutauwa" },
    { startSec: 243, endSec: 286, text: "大海原を駆ける 新しい風になれ", romaji: "oounabarawokakeruatarasiikazeninare" },
  ],

  "8VKKWmhtWSc": [
    { startSec: 26, endSec: 29, text: "僕の前だけで", romaji: "bokunomaedakede" },
    { startSec: 29, endSec: 37, text: "今夜だけ独身に戻る君を僕は責めなかった", romaji: "konyadakedokusinnnimodorukimiwobokuhasemenakatta" },
    { startSec: 37, endSec: 49, text: "時間が許すまで 恋人でいられる気がしてしまってたんだ", romaji: "zikanngayurusumadekoibitodeirarerukigasitesimattetanda" },
    { startSec: 49, endSec: 61, text: "もしも二人 もっと早くに 出会っていたら どうなっていたかな", romaji: "mosimohutarimottohayakunideatteitaradounatteitakana" },
    { startSec: 61, endSec: 66, text: "そんな風に君が言うから答えたんだ", romaji: "sonnnahuunikimigaiukarakotaetannda" },
    { startSec: 66, endSec: 71, text: "今より幸せになってたんじゃない", romaji: "imayorisiawaseninatteitannzyanai" },
    { startSec: 71, endSec: 77, text: "真っ先にひらいた この花が散ることを", romaji: "massakinihiraitakonohanagatirukotowo" },
    { startSec: 77, endSec: 83, text: "わかっていながら まだ甘い夢を見てた", romaji: "wakatteinagaramadaamaiyumewomiteta" },
    { startSec: 83, endSec: 89, text: "それでも 今夜だけでも 隣にいられたら", romaji: "soredemokonnyadakedemotonariniiraretara" },
    { startSec: 89, endSec: 97, text: "僕はそれだけで幸せで君と笑ってた", romaji: "bokuhasoredakedesiawasedekimitowaratteta" },
    { startSec: 97, endSec: 102, text: "いつもはどんな顔をしているか", romaji: "itumohadonnnakaowositeiruka" },
    { startSec: 102, endSec: 108, text: "どんな毎日を送ってるか知らなかった", romaji: "donnnamainitiwookutteirukasiranakatta" },
    { startSec: 108, endSec: 120, text: "薬指の指輪だけが 僕になにか教えてくれた", romaji: "kusuriyubinoyubiwadakegabokuninanikaosietekureta" },
    { startSec: 120, endSec: 126, text: "電話さえ許されなくて", romaji: "denwasaeyurusarenakute" },
    { startSec: 126, endSec: 131, text: "でも抑えられるとまた会いたくなった", romaji: "demoosaerarerutomataaitakuntatta" },
    { startSec: 131, endSec: 142, text: "今夜、元にあった場所に君を戻さないで このまま連れ去れたら", romaji: "konyamotoniattabasyonikimiwomodosanaidekonomamaturesaretara" },
    { startSec: 142, endSec: 149, text: "真っ二つにわれた道の真ん中に立って", romaji: "mapputatuniwaretamitinomannnakanitatte" },
    { startSec: 149, endSec: 155, text: "帰って欲しくない と言えずに手を握った", romaji: "kaettehosikunaitoiezunitewonigitta" },
    { startSec: 155, endSec: 161, text: "君は困った顔のまま 僕の肩に顔を付けた", romaji: "kimihakomattakaonomamabokunokatanikaotuketa" },
    { startSec: 161, endSec: 190, text: "二つの影がまた一つになった", romaji: "hutatunokagegamatahitotuninatta" },
    { startSec: 190, endSec: 196, text: "東京駅前の深夜 陽が落ちた赤煉瓦", romaji: "toukyouekimaenosinnyahigaotitaakarennga" },
    { startSec: 196, endSec: 202, text: "植物園のストーブ 初雪が降った朝", romaji: "syokubutuennnosuto-buhatuyukigahuttaasa" },
    { startSec: 202, endSec: 207, text: "もしも二人もっと早くに出会ってたって", romaji: "mosimohutarimottohayakunideattetatte" },
    { startSec: 207, endSec: 213, text: "報われないってわかってた でも忘れたりできないなら", romaji: "mukuwarenaittewakattetademowasuretaridekinainara" },
    { startSec: 213, endSec: 219, text: "いま時間を戻そう", romaji: "imazikannwomodosou" },
    { startSec: 219, endSec: 226, text: "なんにもいらなかった 君がいてくれたら", romaji: "nannnimoiranakattakimigaitekuretara" },
    { startSec: 226, endSec: 232, text: "一ヶ月に一度だけ甘い夢に触れた", romaji: "ikkagetuniitidodakeamaiyumenihureta" },
    { startSec: 232, endSec: 238, text: "この恋が綺麗な秘密で終わるように", romaji: "konokoigakireinahimitudeowaruyouni" },
    { startSec: 238, endSec: 243, text: "ちゃんと終わらせるから", romaji: "tyanntoowaraserukara" },
    { startSec: 243, endSec: 255, text: "この物語にハッピーエンドなんてないと わかってても これで最後と誓っても", romaji: "konomonogatarinihappi-enndonanntenaitowakattetemokoredesaigototikattemo" },
    { startSec: 255, endSec: 262, text: "何度だって破り捨てて また二人で迎えた日々を", romaji: "nanndodatteyaburisutetematahutaridemukaetahibiwo" },
    { startSec: 262, endSec: 266, text: "もうこれで本当に", romaji: "moukoredehonntouni" },
    { startSec: 266, endSec: 273, text: "最後にしてしまうね 今まで嬉しかったよ", romaji: "saigonisitesimauneimamadeuresikattayo" },
    { startSec: 273, endSec: 280, text: "どこまでも優しい君が好きだったよ", romaji: "dokomademoyasasiikimigasukidattayo" },
    { startSec: 280, endSec: 285, text: "じゃあもう夢から醒めるね", romaji: "zyaamouyumekarasamerune" },
    { startSec: 285, endSec: 290, text: "この音が止まったら", romaji: "konootogatomattara" },
    { startSec: 290, endSec: 295, text: "そこで手を離すね", romaji: "sokodetewohanasune" },
    { startSec: 295, endSec: 332, text: "さようなら", romaji: "sayounara" },
  ],

  "jpOsSnmem0s": [],
  "U8pJgoOhiDs": []

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

const videoTitleCache = new Map()

const resolveVideoTitle = async (videoId, fallbackLines) => {
  if (!videoId) return null
  if (videoTitleCache.has(videoId)) return videoTitleCache.get(videoId)
  if (!YOUTUBE_API_KEY) return null

  const params = new URLSearchParams({
    key: YOUTUBE_API_KEY,
    id: videoId,
    part: "snippet",
    maxResults: "1",
  })
  const url = `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`

  try {
    const res = await fetch(url)
    if (!res.ok) {
      const msg = await res.text().catch(() => "")
      throw new Error(`YouTube videos.list failed: ${res.status} ${msg}`)
    }
    const body = await res.json()
    const title = body?.items?.[0]?.snippet?.title || null
    videoTitleCache.set(videoId, title)
    return title
  } catch (err) {
    console.error("YouTube title fetch failed:", err?.message || err)
    // fallback to seed text if available
    const fallbackTitle = Array.isArray(fallbackLines) && fallbackLines[0]?.text ? fallbackLines[0].text : null
    if (fallbackTitle) videoTitleCache.set(videoId, fallbackTitle)
    return fallbackTitle
  }
}

const fallbackTitle = (videoId, lines) => (Array.isArray(lines) && lines[0]?.text) || videoId

// GET /api/sudden-death/list : 歌詞付き動画の一覧を返す
app.get("/api/sudden-death/list", async (_req, res) => {
  try {
    const entries = await Promise.all(
      Object.entries(suddenDeathCaptions).map(async ([videoId, lines]) => {
        const title = (await resolveVideoTitle(videoId, lines)) || fallbackTitle(videoId, lines)
        return { videoId, title, hasLyrics: true }
      })
    )
    res.json(entries)
  } catch (err) {
    console.error("GET /api/sudden-death/list error", err)
    const entries = Object.entries(suddenDeathCaptions).map(([videoId, lines]) => ({
      videoId,
      title: fallbackTitle(videoId, lines),
      hasLyrics: true,
    }))
    res.json(entries)
  }
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

  const title = (await resolveVideoTitle(videoId, normalized)) || fallbackTitle(videoId, normalized)

  res.json({ title, lines: normalized })
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
  cors: { origin: FRONT_ORIGINS, methods: ["GET", "POST"] },
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
  const corsList = Array.isArray(FRONT_ORIGINS) ? FRONT_ORIGINS.join(",") : FRONT_ORIGINS
  console.log(`API + Socket.IO server listening on http://localhost:${PORT} (CORS: ${corsList})`)
})


