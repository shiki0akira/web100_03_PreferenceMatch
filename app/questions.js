/*
 * 預設題庫。7 個分類各 5 題，主持人開房間時勾選要用哪幾類。
 *
 * ── 為什麼一題的 8 種語言寫在一起 ──
 * 因為**同一個房間裡的人可能各自用不同語言**：主持人開的是同一個房號，
 * 玩家的手機各自顯示自己的語言。所以每一題在所有語言必須是**同一個意思**，
 * 不能為了在地化把「珍珠奶茶」換成當地飲料——那樣兩個人其實在答不同的題，
 * 配對結果就失真了。翻譯要忠實，寧可讀起來稍微外來，也不要改題意。
 * 按題目分組排列就是為了讓「這題在八種語言長什麼樣」一眼看得完、少了誰也看得出來。
 *
 * 房間狀態裡只存 id（見 src/room.js 的 questions），文字永遠在客戶端解析。
 * 新增題目 = 這裡加一筆，`scripts/build.js` 會檢查有沒有漏翻。
 */

// 分類的顯示名稱在 app/locales/{lang}.js 的 categoryXxx，不放這裡
export const CATEGORIES = [
  'life', // 生活習慣
  'food', // 飲食偏好
  'leisure', // 休閒娛樂
  'personality', // 個性與觀念
  'social', // 人際與感情觀
  'belief', // 小信念
  'smallgroup', // 小組破冰（團契／小組聚會用）
];

/*
 * 預設勾選：七個分類各挑一到兩題，湊 10 題（落在建議的 8～10 題裡）。
 *
 * 挑的是每類裡最會讓全場分成兩半的題目——九成人都選同一邊的題目對分組毫無貢獻，
 * 放進預設只是浪費 10 秒。分類本身**不預設展開**：七類全開會讓主持人一進來就面對
 * 三十幾個 checkbox，右邊的「已選題目」才是他該先看的東西。
 */
export const DEFAULT_QUESTION_IDS = [
  'life.morning',
  'life.phone',
  'food.pineapple',
  'food.taro',
  'leisure.horror',
  'leisure.karaoke',
  'personality.spontaneous',
  'social.splitbill',
  'belief.saving',
  'smallgroup.crowd',
];

export const QUESTIONS = [
  // ── 生活習慣 ──────────────────────────────────────────────
  {
    id: 'life.morning',
    category: 'life',
    text: {
      'zh-TW': '我是晨型人，早上比晚上有精神',
      'zh-CN': '我是晨型人，早上比晚上有精神',
      en: 'I am a morning person — I have more energy early than late',
      de: 'Ich bin ein Morgenmensch — morgens habe ich mehr Energie als abends',
      fr: "Je suis du matin — j'ai plus d'énergie le matin que le soir",
      ja: '私は朝型で、夜より朝のほうが元気だ',
      ko: '나는 아침형 인간이라 저녁보다 아침에 더 기운이 난다',
      es: 'Soy de mañanas: tengo más energía temprano que de noche',
    },
  },
  {
    id: 'life.breakfast',
    category: 'life',
    text: {
      'zh-TW': '早餐一定要吃，不吃全身不對勁',
      'zh-CN': '早餐一定要吃，不吃全身不对劲',
      en: 'I have to eat breakfast — skipping it throws off my whole day',
      de: 'Frühstück muss sein — ohne fühlt sich der ganze Tag falsch an',
      fr: 'Je dois petit-déjeuner : sans ça, toute ma journée est déréglée',
      ja: '朝食は必ず食べる。抜くと一日中調子が出ない',
      ko: '아침은 꼭 먹어야 한다. 거르면 하루 종일 컨디션이 이상하다',
      es: 'Tengo que desayunar: si no, todo el día se me hace raro',
    },
  },
  {
    id: 'life.tidy',
    category: 'life',
    text: {
      'zh-TW': '我的房間隨時都是整齊的',
      'zh-CN': '我的房间随时都是整齐的',
      en: 'My room is tidy basically all the time',
      de: 'Mein Zimmer ist eigentlich immer aufgeräumt',
      fr: 'Ma chambre est rangée pratiquement tout le temps',
      ja: '私の部屋はいつも片づいている',
      ko: '내 방은 거의 항상 정리되어 있다',
      es: 'Mi habitación está ordenada prácticamente siempre',
    },
  },
  {
    id: 'life.nap',
    category: 'life',
    text: {
      'zh-TW': '午睡是必要的，沒睡下午會很難撐',
      'zh-CN': '午睡是必要的，没睡下午会很难撑',
      en: 'A nap is essential — without one the afternoon is rough',
      de: 'Ein Mittagsschlaf muss sein — ohne wird der Nachmittag hart',
      fr: 'La sieste est indispensable : sans elle, l’après-midi est difficile',
      ja: '昼寝は必須だ。寝ないと午後がつらい',
      ko: '낮잠은 필수다. 안 자면 오후가 힘들다',
      es: 'La siesta es imprescindible: sin ella la tarde se hace dura',
    },
  },
  {
    id: 'life.phone',
    category: 'life',
    text: {
      'zh-TW': '睡前我一定會滑手機滑到很晚',
      'zh-CN': '睡前我一定会刷手机刷到很晚',
      en: 'I always end up on my phone until late before bed',
      de: 'Vor dem Schlafen hänge ich immer bis spät am Handy',
      fr: 'Avant de dormir, je reste toujours sur mon téléphone jusqu’à tard',
      ja: '寝る前はいつもスマホを遅くまで見てしまう',
      ko: '자기 전에 늘 늦게까지 휴대폰을 보게 된다',
      es: 'Antes de dormir siempre acabo con el móvil hasta tarde',
    },
  },

  // ── 飲食偏好 ──────────────────────────────────────────────
  {
    id: 'food.boba',
    category: 'food',
    text: {
      'zh-TW': '珍珠奶茶一定要正常糖、正常冰',
      'zh-CN': '珍珠奶茶一定要正常糖、正常冰',
      en: 'Bubble tea has to be full sugar, regular ice',
      de: 'Bubble Tea muss mit normalem Zucker und normalem Eis sein',
      fr: 'Le bubble tea doit être sucre normal, glace normale',
      ja: 'タピオカミルクティーは砂糖も氷も普通が一番だ',
      ko: '버블티는 당도도 얼음도 기본이 최고다',
      es: 'El bubble tea tiene que ser con azúcar normal y hielo normal',
    },
  },
  {
    id: 'food.pineapple',
    category: 'food',
    text: {
      'zh-TW': '鳳梨可以加在披薩上',
      'zh-CN': '菠萝可以加在披萨上',
      en: 'Pineapple belongs on pizza',
      de: 'Ananas gehört auf die Pizza',
      fr: "L'ananas a sa place sur une pizza",
      ja: 'ピザにパイナップルをのせてもいい',
      ko: '피자에 파인애플을 올려도 괜찮다',
      es: 'La piña queda bien en la pizza',
    },
  },
  {
    id: 'food.taro',
    category: 'food',
    text: {
      'zh-TW': '火鍋一定要加芋頭',
      'zh-CN': '火锅一定要加芋头',
      en: 'Hot pot needs taro in it',
      de: 'In den Hotpot gehört unbedingt Taro',
      fr: 'Une fondue chinoise doit contenir du taro',
      ja: '火鍋にはタロイモを入れるべきだ',
      ko: '훠궈에는 토란을 꼭 넣어야 한다',
      es: 'Al hot pot hay que echarle taro',
    },
  },
  {
    id: 'food.coriander',
    category: 'food',
    text: {
      'zh-TW': '香菜很好吃，多加一點也沒關係',
      'zh-CN': '香菜很好吃，多加一点也没关系',
      en: 'Coriander tastes great — pile it on',
      de: 'Koriander schmeckt super — davon gern mehr',
      fr: 'La coriandre est délicieuse — on peut en mettre beaucoup',
      ja: 'パクチーはおいしい。多めでも平気だ',
      ko: '고수는 맛있다. 많이 넣어도 괜찮다',
      es: 'El cilantro está buenísimo: cuanto más, mejor',
    },
  },
  {
    id: 'food.spicy',
    category: 'food',
    text: {
      'zh-TW': '越辣越過癮，不辣的食物少一味',
      'zh-CN': '越辣越过瘾，不辣的食物少一味',
      en: 'The spicier the better — food without heat feels like it is missing something',
      de: 'Je schärfer, desto besser — ohne Schärfe fehlt dem Essen etwas',
      fr: 'Plus c’est épicé, mieux c’est — sans piment, il manque quelque chose',
      ja: '辛ければ辛いほどいい。辛くない料理は物足りない',
      ko: '매울수록 좋다. 안 매운 음식은 뭔가 부족하다',
      es: 'Cuanto más picante, mejor: sin picante le falta algo a la comida',
    },
  },

  // ── 休閒娛樂 ──────────────────────────────────────────────
  {
    id: 'leisure.series',
    category: 'leisure',
    text: {
      'zh-TW': '比起看電影，我更喜歡追劇集',
      'zh-CN': '比起看电影，我更喜欢追剧集',
      en: 'I would rather binge a series than watch a film',
      de: 'Ich schaue lieber eine Serie als einen Film',
      fr: 'Je préfère enchaîner une série plutôt que regarder un film',
      ja: '映画よりドラマを一気見するほうが好きだ',
      ko: '영화보다 드라마를 몰아 보는 게 더 좋다',
      es: 'Prefiero ver una serie del tirón antes que una película',
    },
  },
  {
    id: 'leisure.horror',
    category: 'leisure',
    text: {
      'zh-TW': '我覺得看恐怖片其實蠻享受的',
      'zh-CN': '我觉得看恐怖片其实挺享受的',
      en: 'I actually enjoy watching horror films',
      de: 'Ich schaue Horrorfilme tatsächlich gern',
      fr: "J'aime vraiment regarder des films d'horreur",
      ja: 'ホラー映画を観るのは実は楽しい',
      ko: '공포 영화 보는 걸 사실 즐기는 편이다',
      es: 'La verdad es que disfruto viendo películas de terror',
    },
  },
  {
    id: 'leisure.outdoor',
    category: 'leisure',
    text: {
      'zh-TW': '假日我寧願出門走走，也不想待在家',
      'zh-CN': '假日我宁愿出门走走，也不想待在家',
      en: 'On days off I would rather go out than stay home',
      de: 'An freien Tagen gehe ich lieber raus, als zu Hause zu bleiben',
      fr: 'Les jours de congé, je préfère sortir plutôt que rester chez moi',
      ja: '休みの日は家にいるより出かけたい',
      ko: '쉬는 날에는 집에 있기보다 나가는 편이 좋다',
      es: 'En mis días libres prefiero salir que quedarme en casa',
    },
  },
  {
    id: 'leisure.spoiler',
    category: 'leisure',
    text: {
      'zh-TW': '先知道劇情也無所謂，不影響我看的興致',
      'zh-CN': '先知道剧情也无所谓，不影响我看的兴致',
      en: 'Spoilers do not bother me — knowing the plot does not ruin it',
      de: 'Spoiler stören mich nicht — die Handlung vorher zu kennen ist okay',
      fr: 'Les spoilers ne me dérangent pas : connaître l’intrigue ne gâche rien',
      ja: 'ネタバレは平気だ。先に筋を知っていても楽しめる',
      ko: '스포일러는 상관없다. 줄거리를 알아도 재미가 줄지 않는다',
      es: 'Los spoilers no me molestan: saber la trama no me arruina nada',
    },
  },
  {
    id: 'leisure.karaoke',
    category: 'leisure',
    text: {
      'zh-TW': '唱 KTV 的時候我很願意搶麥克風',
      'zh-CN': '唱 KTV 的时候我很愿意抢麦克风',
      en: 'At karaoke I am happy to grab the microphone',
      de: 'Beim Karaoke greife ich gern zum Mikrofon',
      fr: 'Au karaoké, je prends volontiers le micro',
      ja: 'カラオケでは進んでマイクを取るほうだ',
      ko: '노래방에서 마이크를 기꺼이 잡는 편이다',
      es: 'En el karaoke no me importa quedarme con el micrófono',
    },
  },

  // ── 個性與觀念 ────────────────────────────────────────────
  {
    id: 'personality.slowwarm',
    category: 'personality',
    text: {
      'zh-TW': '我覺得自己是慢熟型的人',
      'zh-CN': '我觉得自己是慢热型的人',
      en: 'I think of myself as someone who takes a while to warm up',
      de: 'Ich halte mich für jemanden, der lange braucht, um aufzutauen',
      fr: 'Je me considère comme quelqu’un qui met du temps à s’ouvrir',
      ja: '自分は打ち解けるのに時間がかかるタイプだと思う',
      ko: '나는 사람들과 친해지는 데 시간이 걸리는 편이다',
      es: 'Me considero alguien a quien le cuesta soltarse al principio',
    },
  },
  {
    id: 'personality.spontaneous',
    category: 'personality',
    text: {
      'zh-TW': '我喜歡臨時起意的行程，勝過事先排好計畫',
      'zh-CN': '我喜欢临时起意的行程，胜过事先排好计划',
      en: 'I prefer spontaneous plans over everything being scheduled in advance',
      de: 'Spontane Pläne sind mir lieber als alles vorher durchzuplanen',
      fr: 'Je préfère l’improvisation à un programme prévu à l’avance',
      ja: '前もって計画するより、その場の思いつきで動くほうが好きだ',
      ko: '미리 계획을 짜기보다 즉흥적으로 움직이는 게 좋다',
      es: 'Prefiero los planes espontáneos a tenerlo todo programado',
    },
  },
  {
    id: 'personality.decisive',
    category: 'personality',
    text: {
      'zh-TW': '做決定的時候我很快，不太會猶豫',
      'zh-CN': '做决定的时候我很快，不太会犹豫',
      en: 'I decide quickly and do not agonise much',
      de: 'Ich entscheide schnell und zögere selten lange',
      fr: 'Je décide vite et j’hésite rarement longtemps',
      ja: '決断は早いほうで、あまり迷わない',
      ko: '결정을 빨리 하는 편이고 많이 망설이지 않는다',
      es: 'Decido rápido y no le doy muchas vueltas',
    },
  },
  {
    id: 'personality.alonetime',
    category: 'personality',
    text: {
      'zh-TW': '一個人獨處的時間對我來說是充電',
      'zh-CN': '一个人独处的时间对我来说是充电',
      en: 'Time alone is how I recharge',
      de: 'Zeit für mich allein lädt meine Batterien wieder auf',
      fr: 'Le temps seul est ce qui me recharge',
      ja: '一人の時間が自分にとっての充電になる',
      ko: '혼자 있는 시간이 나에게는 충전이 된다',
      es: 'El tiempo a solas es lo que me recarga',
    },
  },
  {
    id: 'personality.confront',
    category: 'personality',
    text: {
      'zh-TW': '有話我會直接說，不喜歡拐彎抹角',
      'zh-CN': '有话我会直接说，不喜欢拐弯抹角',
      en: 'I say things straight — I dislike beating around the bush',
      de: 'Ich sage Dinge direkt und rede nicht gern um den heißen Brei herum',
      fr: 'Je dis les choses franchement, je n’aime pas tourner autour du pot',
      ja: '言いたいことは率直に言う。遠回しな言い方は好きではない',
      ko: '할 말은 직접 한다. 돌려 말하는 건 좋아하지 않는다',
      es: 'Digo las cosas directamente, no me gusta andarme con rodeos',
    },
  },

  // ── 人際與感情觀 ──────────────────────────────────────────
  {
    id: 'social.splitbill',
    category: 'social',
    text: {
      'zh-TW': '朋友之間出去玩，各付各的比較自在',
      'zh-CN': '朋友之间出去玩，各付各的比较自在',
      en: 'With friends, splitting the bill evenly feels more comfortable',
      de: 'Unter Freunden ist getrennt zahlen für mich angenehmer',
      fr: 'Entre amis, je trouve plus confortable que chacun paie sa part',
      ja: '友達同士では割り勘のほうが気楽だ',
      ko: '친구끼리는 각자 내는 게 더 편하다',
      es: 'Entre amigos, pagar cada uno lo suyo es más cómodo',
    },
  },
  {
    id: 'social.loveatfirstsight',
    category: 'social',
    text: {
      'zh-TW': '我相信一見鍾情這件事',
      'zh-CN': '我相信一见钟情这件事',
      en: 'I believe in love at first sight',
      de: 'Ich glaube an Liebe auf den ersten Blick',
      fr: 'Je crois au coup de foudre',
      ja: '一目惚れというものはあると思う',
      ko: '첫눈에 반하는 사랑은 있다고 믿는다',
      es: 'Creo en el amor a primera vista',
    },
  },
  {
    id: 'social.textback',
    category: 'social',
    text: {
      'zh-TW': '訊息我通常會馬上回，不會放著',
      'zh-CN': '消息我通常会马上回，不会放着',
      en: 'I usually reply to messages right away rather than leaving them',
      de: 'Nachrichten beantworte ich meist sofort, statt sie liegen zu lassen',
      fr: 'Je réponds généralement aux messages tout de suite au lieu de les laisser',
      ja: 'メッセージはたいていすぐ返す。放っておかない',
      ko: '메시지는 보통 바로 답한다. 미뤄 두지 않는다',
      es: 'Normalmente respondo los mensajes al momento, no los dejo ahí',
    },
  },
  {
    id: 'social.longdistance',
    category: 'social',
    text: {
      'zh-TW': '遠距離戀愛是可行的',
      'zh-CN': '异地恋是可行的',
      en: 'Long-distance relationships can work',
      de: 'Fernbeziehungen können funktionieren',
      fr: 'Les relations à distance peuvent fonctionner',
      ja: '遠距離恋愛はうまくいくと思う',
      ko: '장거리 연애도 충분히 가능하다',
      es: 'Las relaciones a distancia pueden funcionar',
    },
  },
  {
    id: 'social.friendsfirst',
    category: 'social',
    text: {
      'zh-TW': '好朋友先變成戀人，比較容易長久',
      'zh-CN': '好朋友先变成恋人，比较容易长久',
      en: 'Relationships that start as close friendships tend to last longer',
      de: 'Beziehungen, die als enge Freundschaft beginnen, halten meist länger',
      fr: 'Les relations qui commencent par une vraie amitié durent plus longtemps',
      ja: '親しい友達から恋人になったほうが長続きしやすい',
      ko: '친한 친구에서 연인이 된 사이가 더 오래간다',
      es: 'Las relaciones que empiezan como amistad suelen durar más',
    },
  },

  // ── 小信念 ────────────────────────────────────────────────
  {
    id: 'belief.hardwork',
    category: 'belief',
    text: {
      'zh-TW': '我相信有志者事竟成',
      'zh-CN': '我相信有志者事竟成',
      en: 'I believe that where there is a will, there is a way',
      de: 'Ich glaube: Wo ein Wille ist, ist auch ein Weg',
      fr: 'Je crois que quand on veut, on peut',
      ja: '意志があれば道は開けると思う',
      ko: '뜻이 있는 곳에 길이 있다고 믿는다',
      es: 'Creo que querer es poder',
    },
  },
  {
    id: 'belief.saving',
    category: 'belief',
    text: {
      'zh-TW': '存錢比投資更能讓我有安全感',
      'zh-CN': '存钱比投资更能让我有安全感',
      en: 'Saving money makes me feel safer than investing it',
      de: 'Sparen gibt mir mehr Sicherheit als Investieren',
      fr: 'Épargner me rassure plus qu’investir',
      ja: '投資より貯金のほうが安心できる',
      ko: '투자보다 저축이 더 안심이 된다',
      es: 'Ahorrar me da más seguridad que invertir',
    },
  },
  {
    id: 'belief.fate',
    category: 'belief',
    text: {
      'zh-TW': '人生的重要際遇是註定好的',
      'zh-CN': '人生的重要际遇是注定好的',
      en: 'The big turning points in life are meant to happen',
      de: 'Die großen Wendepunkte im Leben sind vorherbestimmt',
      fr: 'Les grands tournants de la vie sont écrits d’avance',
      ja: '人生の大きな出会いはあらかじめ決まっている',
      ko: '인생의 중요한 만남은 정해져 있다고 생각한다',
      es: 'Los grandes momentos de la vida están destinados a ocurrir',
    },
  },
  {
    id: 'belief.change',
    category: 'belief',
    text: {
      'zh-TW': '人是真的可以改變的',
      'zh-CN': '人是真的可以改变的',
      en: 'People really can change',
      de: 'Menschen können sich wirklich ändern',
      fr: 'Les gens peuvent vraiment changer',
      ja: '人は本当に変われると思う',
      ko: '사람은 정말로 변할 수 있다',
      es: 'Las personas de verdad pueden cambiar',
    },
  },
  {
    id: 'belief.luck',
    category: 'belief',
    text: {
      'zh-TW': '運氣比努力更能決定結果',
      'zh-CN': '运气比努力更能决定结果',
      en: 'Luck decides outcomes more than effort does',
      de: 'Glück entscheidet mehr über das Ergebnis als Anstrengung',
      fr: 'La chance détermine le résultat plus que les efforts',
      ja: '結果を決めるのは努力より運だ',
      ko: '결과를 결정하는 건 노력보다 운이다',
      es: 'La suerte decide el resultado más que el esfuerzo',
    },
  },

  // ── 小組破冰 ──────────────────────────────────────────────
  {
    id: 'smallgroup.crowd',
    category: 'smallgroup',
    text: {
      'zh-TW': '比起一對一聊天，我更享受一群人聚在一起',
      'zh-CN': '比起一对一聊天，我更享受一群人聚在一起',
      en: 'I enjoy being in a group more than one-on-one conversations',
      de: 'Ich bin lieber in der Gruppe als in Gesprächen unter vier Augen',
      fr: 'Je préfère être en groupe plutôt qu’en tête-à-tête',
      ja: '一対一で話すより、大勢で集まるほうが楽しい',
      ko: '일대일 대화보다 여럿이 모이는 게 더 즐겁다',
      es: 'Disfruto más estando en grupo que en conversaciones de dos',
    },
  },
  {
    id: 'smallgroup.testimony',
    category: 'smallgroup',
    text: {
      'zh-TW': '分享自己的生命故事，比讀經討論更讓我有收穫',
      'zh-CN': '分享自己的生命故事，比读经讨论更让我有收获',
      en: 'I get more out of sharing life stories than out of Bible study discussion',
      de: 'Aus dem Erzählen von Lebensgeschichten nehme ich mehr mit als aus Bibelgesprächen',
      fr: 'Je retire plus du partage de récits de vie que de l’étude biblique',
      ja: '聖書の学びより、自分の歩みを分かち合うほうが得るものが多い',
      ko: '성경 공부보다 삶의 이야기를 나눌 때 얻는 게 더 많다',
      es: 'Saco más de compartir historias de vida que del estudio bíblico',
    },
  },
  {
    id: 'smallgroup.prayaloud',
    category: 'smallgroup',
    text: {
      'zh-TW': '在小組裡開口禱告，我不會緊張',
      'zh-CN': '在小组里开口祷告，我不会紧张',
      en: 'Praying out loud in a small group does not make me nervous',
      de: 'Laut in der Kleingruppe zu beten macht mich nicht nervös',
      fr: 'Prier à voix haute en petit groupe ne me rend pas nerveux',
      ja: '小グループで声に出して祈るのは緊張しない',
      ko: '소그룹에서 소리 내어 기도하는 게 긴장되지 않는다',
      es: 'Orar en voz alta en un grupo pequeño no me pone nervioso',
    },
  },
  {
    id: 'smallgroup.newcomer',
    category: 'smallgroup',
    text: {
      'zh-TW': '帶新朋友來聚會，對我來說不困難',
      'zh-CN': '带新朋友来聚会，对我来说不困难',
      en: 'Bringing a new friend along to a gathering is easy for me',
      de: 'Einen neuen Freund zu einem Treffen mitzubringen fällt mir leicht',
      fr: 'Amener un nouvel ami à une rencontre ne me pose pas de problème',
      ja: '新しい友達を集まりに連れて来るのは難しくない',
      ko: '새로운 친구를 모임에 데려오는 건 어렵지 않다',
      es: 'Traer a un amigo nuevo a una reunión me resulta fácil',
    },
  },
  {
    id: 'smallgroup.worship',
    category: 'smallgroup',
    text: {
      'zh-TW': '聚會裡我最期待的是敬拜的時間',
      'zh-CN': '聚会里我最期待的是敬拜的时间',
      en: 'Worship is the part of a gathering I look forward to most',
      de: 'Auf die Lobpreiszeit freue ich mich bei einem Treffen am meisten',
      fr: 'La louange est le moment que j’attends le plus lors d’une rencontre',
      ja: '集まりの中で一番楽しみなのは賛美の時間だ',
      ko: '모임에서 가장 기대되는 건 찬양 시간이다',
      es: 'La alabanza es la parte de la reunión que más espero',
    },
  },
];

// 給 build 用的檢查：每一題在每個語言都要有文字，少一個就讓 build 失敗
export function checkQuestions(langs) {
  const seen = new Set();

  for (const question of QUESTIONS) {
    if (seen.has(question.id)) throw new Error(`題庫有重複的 id：${question.id}`);
    seen.add(question.id);

    if (!CATEGORIES.includes(question.category)) {
      throw new Error(`${question.id} 的分類 ${question.category} 不在 CATEGORIES 裡`);
    }
    for (const lang of langs) {
      if (!question.text[lang]) throw new Error(`${question.id} 少了 ${lang} 的翻譯`);
    }
    const extra = Object.keys(question.text).filter((lang) => !langs.includes(lang));
    if (extra.length) throw new Error(`${question.id} 多了不在 LANGS 裡的語言：${extra.join(', ')}`);
  }
}

// 主持人畫面用：依分類分組列出題目
export function questionsByCategory(lang) {
  return CATEGORIES.map((category) => ({
    category,
    questions: QUESTIONS.filter((question) => question.category === category).map((question) => ({
      id: question.id,
      text: question.text[lang],
    })),
  }));
}
