/* Dữ liệu từ vựng của Bếp Quê.
 * rects: vùng chạm [x, y, rộng, cao] tính theo pixel của ảnh gốc 1672 × 941.
 * en / ja: các đáp án hợp lệ. reading + romaji: cách đọc chính của tiếng Nhật.
 * alt: cách đọc riêng cho những đáp án đọc khác cách đọc chính.
 * room: id phòng (xem ROOMS bên dưới), mặc định 'bep'.
 * discovered / learned: trạng thái, được game.js nạp từ localStorage.
 */
function makeItem(id, vi, en, ja, reading, romaji, note, rects, alt, room) {
  return { id, vi, en, ja, reading, romaji, note, rects, alt: alt || {}, room: room || 'bep', discovered: false, learned: false };
}

/* Danh sách phòng, theo thứ tự mở khóa: hoàn thành phòng trước mới mở phòng sau.
 * Muốn thêm phòng mới: thêm ảnh (1672 × 941) vào assets/, thêm một mục ở đây,
 * rồi thêm đồ vật có room = id phòng (xem mẫu L(...) bên dưới). */
const ROOMS = [
  { id: 'bep', name: 'Nhà bếp', img: 'assets/kitchen-background.png', alt: 'Căn bếp quê Việt Nam',
    desc: 'Nồi, chảo, bát đũa và những món đồ quen thuộc.' },
  { id: 'khach', name: 'Phòng khách', img: 'assets/living-room.png', alt: 'Phòng khách nhà quê Việt Nam',
    desc: 'Bộ ghế gỗ, bàn trà, tivi và bàn thờ.' }
];

const VOCAB = [
  // Đồ vật lớn xếp trước để đồ vật nhỏ nằm đè lên khi chồng vùng chạm
  makeItem('banana', 'Cây chuối', ['banana tree', 'banana plant'], ['バナナの木', 'バナナのき'], 'バナナのき', 'banana no ki',
    'Cây chuối mọc nhiều ở vườn quê, lá to dùng gói bánh.', [[1375, 190, 150, 240]]),
  makeItem('field', 'Ruộng lúa', ['rice field', 'paddy', 'rice paddy'], ['田んぼ', 'たんぼ', '水田', 'すいでん'], 'たんぼ', 'tanbo',
    'Cánh đồng xanh trải dài ngoài sân.', [[1190, 418, 270, 50]], { '水田': ['すいでん', 'suiden'], 'すいでん': ['すいでん', 'suiden'] }),
  makeItem('window', 'Cửa sổ', ['window'], ['窓', 'まど'], 'まど', 'mado',
    'Song cửa gỗ cho ánh nắng và gió lùa vào bếp.', [[180, 165, 245, 250]]),
  makeItem('fridge', 'Tủ lạnh', ['fridge', 'refrigerator'], ['冷蔵庫', 'れいぞうこ'], 'れいぞうこ', 'reizouko',
    'Chiếc tủ lạnh màu xanh bạc hà cũ kỹ, giữ thức ăn mát.', [[0, 170, 165, 245]]),
  makeItem('plant', 'Cây cảnh', ['plant', 'houseplant', 'potted plant'], ['観葉植物', 'かんようしょくぶつ', '植物', 'しょくぶつ', '鉢植え', 'はちうえ'],
    'かんようしょくぶつ', 'kanyou shokubutsu', 'Chậu cây xanh và hoa trắng đặt ở góc bếp.', [[0, 415, 170, 500]],
    { '植物': ['しょくぶつ', 'shokubutsu'], 'しょくぶつ': ['しょくぶつ', 'shokubutsu'], '鉢植え': ['はちうえ', 'hachiue'], 'はちうえ': ['はちうえ', 'hachiue'] }),
  makeItem('cabinet', 'Tủ bếp', ['cabinet', 'cupboard', 'kitchen cabinet'], ['戸棚', 'とだな', '食器棚', 'しょっきだな', '棚', 'たな', 'キャビネット'],
    'とだな', 'todana', 'Tủ gỗ cửa chớp để cất bát đĩa và đồ dùng.', [[403, 505, 165, 200]],
    { '食器棚': ['しょっきだな', 'shokkidana'], 'しょっきだな': ['しょっきだな', 'shokkidana'], '棚': ['たな', 'tana'], 'たな': ['たな', 'tana'], 'キャビネット': ['キャビネット', 'kyabinetto'] }),
  makeItem('table', 'Cái bàn', ['table', 'dining table'], ['テーブル', 'てーぶる', '食卓', 'しょくたく'], 'テーブル', 'teeburu',
    'Chiếc bàn gỗ lớn, cả nhà quây quần ăn cơm.', [[485, 565, 620, 370]],
    { 'てーぶる': ['テーブル', 'teeburu'], '食卓': ['しょくたく', 'shokutaku'], 'しょくたく': ['しょくたく', 'shokutaku'] }),
  makeItem('stool', 'Cái ghế', ['chair', 'stool'], ['椅子', 'いす', 'イス', 'スツール'], 'いす', 'isu',
    'Ghế đẩu bằng gỗ kê quanh bàn ăn.', [[565, 685, 140, 195], [745, 680, 125, 130], [975, 690, 135, 205], [655, 768, 235, 173]],
    { 'スツール': ['スツール', 'sutsuuru'] }),
  makeItem('lamp', 'Cái đèn', ['lamp', 'light', 'lantern'], ['ランプ', 'らんぷ', '電灯', 'でんとう', '照明', 'しょうめい', 'ライト'], 'ランプ', 'ranpu',
    'Chao đèn đan bằng mây tre treo giữa nhà.', [[740, 0, 135, 135]],
    { 'らんぷ': ['ランプ', 'ranpu'], '電灯': ['でんとう', 'dentou'], 'でんとう': ['でんとう', 'dentou'], '照明': ['しょうめい', 'shoumei'], 'しょうめい': ['しょうめい', 'shoumei'], 'ライト': ['ライト', 'raito'] }),
  makeItem('basket', 'Rổ tre', ['basket', 'bamboo basket'], ['籠', 'かご', 'カゴ', 'バスケット'], 'かご', 'kago',
    'Rổ đan bằng tre, dùng đựng rau củ và đồ lặt vặt.',
    [[175, 665, 70, 80], [275, 640, 105, 65], [388, 443, 102, 55], [708, 540, 138, 57], [1555, 750, 117, 191]],
    { 'バスケット': ['バスケット', 'basuketto'] }),
  makeItem('jar', 'Cái chum', ['jar', 'clay jar', 'urn'], ['壺', 'つぼ', '甕', 'かめ'], 'つぼ', 'tsubo',
    'Chum sành to, ngày xưa dùng chứa nước hoặc gạo.', [[1392, 505, 82, 122]], { '甕': ['かめ', 'kame'], 'かめ': ['かめ', 'kame'] }),
  makeItem('bucket', 'Cái xô', ['bucket', 'pail'], ['バケツ', 'ばけつ'], 'バケツ', 'baketsu',
    'Xô đỏ dùng xách nước.', [[1503, 622, 100, 115]]),
  makeItem('chicken', 'Con gà', ['chicken', 'hen'], ['鶏', 'にわとり', 'ニワトリ'], 'にわとり', 'niwatori',
    'Gà thả vườn đang đi dạo ngoài sân.', [[1235, 545, 72, 52]]),
  makeItem('corn', 'Bắp ngô', ['corn', 'maize'], ['とうもろこし', 'トウモロコシ', 'コーン'], 'とうもろこし', 'toumorokoshi',
    'Bắp ngô vàng treo phơi trên giàn.', [[1545, 188, 55, 100]], { 'コーン': ['コーン', 'koon'] }),
  makeItem('pot', 'Cái nồi', ['pot', 'cooking pot', 'saucepan'], ['鍋', 'なべ', 'お鍋', 'おなべ'], 'なべ', 'nabe',
    'Nồi inox lớn đặt trên bếp để nấu canh, luộc rau.', [[475, 408, 160, 75]], { 'お鍋': ['おなべ', 'onabe'], 'おなべ': ['おなべ', 'onabe'] }),
  makeItem('pan', 'Cái chảo', ['pan', 'frying pan', 'skillet'], ['フライパン', 'ふらいぱん'], 'フライパン', 'furaipan',
    'Chảo treo trên tường, dùng để rán và xào.', [[500, 275, 150, 125]]),
  makeItem('bottles', 'Cái chai', ['bottle', 'bottles'], ['瓶', 'びん', 'ボトル'], 'びん', 'bin',
    'Chai nước mắm, dầu ăn và gia vị xếp trên kệ bếp.', [[635, 405, 165, 72]], { 'ボトル': ['ボトル', 'botoru'] }),
  makeItem('chili', 'Quả ớt', ['chili', 'chilli', 'chili pepper', 'pepper'], ['唐辛子', 'とうがらし'], 'とうがらし', 'tougarashi',
    'Chùm ớt đỏ phơi khô, ăn rất cay.', [[710, 290, 32, 70]]),
  makeItem('garlic', 'Tép tỏi', ['garlic'], ['にんにく', 'ニンニク', '大蒜'], 'にんにく', 'ninniku',
    'Chùm tỏi treo trên tường để dùng dần.', [[750, 280, 32, 122]]),
  makeItem('teapot', 'Ấm trà', ['teapot', 'tea pot'], ['急須', 'きゅうす', 'ティーポット'], 'きゅうす', 'kyuusu',
    'Ấm sứ men xanh trắng để pha trà.', [[836, 520, 70, 75]], { 'ティーポット': ['ティーポット', 'tiipotto'] }),
  makeItem('faucet', 'Vòi nước', ['faucet', 'tap'], ['蛇口', 'じゃぐち'], 'じゃぐち', 'jaguchi',
    'Vòi nước bên bồn rửa bát.', [[298, 427, 49, 70]]),
  makeItem('towel', 'Khăn lau', ['towel', 'dish towel', 'tea towel'], ['タオル', 'たおる', '布巾', 'ふきん'], 'タオル', 'taoru',
    'Khăn sọc đỏ vắt trên bàn bếp.', [[303, 503, 58, 92]],
    { 'たおる': ['タオル', 'taoru'], '布巾': ['ふきん', 'fukin'], 'ふきん': ['ふきん', 'fukin'] }),
  makeItem('vase', 'Lọ hoa', ['vase', 'flower vase'], ['花瓶', 'かびん'], 'かびん', 'kabin',
    'Lọ gốm cắm hoa cúc trắng, tô điểm góc bếp.', [[165, 370, 100, 140]]),
  makeItem('bowl', 'Cái bát', ['bowl', 'rice bowl'], ['茶碗', 'ちゃわん', 'お椀', 'おわん', 'ボウル'], 'ちゃわん', 'chawan',
    'Bát sứ xếp trên kệ gầm bếp, dùng đựng cơm hoặc canh.', [[168, 590, 72, 45]],
    { 'お椀': ['おわん', 'owan'], 'おわん': ['おわん', 'owan'], 'ボウル': ['ボウル', 'bouru'] }),
  makeItem('chopsticks', 'Đôi đũa', ['chopsticks'], ['箸', 'はし', 'お箸', 'おはし'], 'はし', 'hashi',
    'Đũa cắm trong ống đựng bên bồn rửa. Người Việt và người Nhật đều ăn bằng đũa.', [[356, 425, 50, 32]],
    { 'お箸': ['おはし', 'ohashi'], 'おはし': ['おはし', 'ohashi'] }),
  makeItem('cup', 'Cái cốc', ['cup', 'mug'], ['コップ', 'カップ', 'マグカップ'], 'コップ', 'koppu',
    'Cốc để uống nước, đặt cạnh bồn rửa.', [[362, 453, 38, 40]],
    { 'カップ': ['カップ', 'kappu'], 'マグカップ': ['マグカップ', 'magukappu'] })
];

/* ---------- Phòng khách ---------- */
const L = (id, vi, en, ja, reading, romaji, note, rects, alt) => makeItem('lv_' + id, vi, en, ja, reading, romaji, note, rects, alt, 'khach');
VOCAB.push(
  // Đồ vật lớn xếp trước để đồ vật nhỏ nằm đè lên
  L('rug', 'Tấm thảm', ['rug', 'mat', 'carpet'], ['敷物', 'しきもの', 'マット', 'ラグ', 'カーペット', '絨毯', 'じゅうたん'], 'しきもの', 'shikimono',
    'Tấm thảm cói đan trải giữa phòng khách.', [[345, 695, 760, 235]],
    { 'マット': ['マット', 'matto'], 'ラグ': ['ラグ', 'ragu'], 'カーペット': ['カーペット', 'kaapetto'], '絨毯': ['じゅうたん', 'juutan'], 'じゅうたん': ['じゅうたん', 'juutan'] }),
  L('tree', 'Cái cây', ['tree'], ['木', 'き', '樹木', 'じゅもく'], 'き', 'ki',
    'Cây lớn tỏa bóng mát ngoài sân.', [[1115, 225, 200, 280]], { '樹木': ['じゅもく', 'jumoku'], 'じゅもく': ['じゅもく', 'jumoku'] }),
  L('field', 'Ruộng lúa', ['rice field', 'paddy', 'rice paddy'], ['田んぼ', 'たんぼ', '水田', 'すいでん'], 'たんぼ', 'tanbo',
    'Ruộng lúa xanh nhìn qua cửa chính.', [[1160, 412, 270, 50]], { '水田': ['すいでん', 'suiden'], 'すいでん': ['すいでん', 'suiden'] }),
  L('fence', 'Hàng rào', ['fence'], ['柵', 'さく', 'フェンス', '垣根', 'かきね'], 'さく', 'saku',
    'Hàng rào gỗ quanh sân nhà.', [[1352, 418, 85, 130]], { 'フェンス': ['フェンス', 'fensu'], '垣根': ['かきね', 'kakine'], 'かきね': ['かきね', 'kakine'] }),
  L('cabinet', 'Tủ gỗ', ['cabinet', 'cupboard', 'sideboard', 'wooden cabinet'], ['戸棚', 'とだな', 'キャビネット', 'サイドボード'], 'とだな', 'todana',
    'Tủ gỗ lớn, phía trên đặt bàn thờ nhỏ.', [[765, 358, 215, 215]], { 'キャビネット': ['キャビネット', 'kyabinetto'], 'サイドボード': ['サイドボード', 'saidobodo'] }),
  L('sofa', 'Ghế dài', ['sofa', 'couch', 'bench'], ['ソファ', 'ソファー', '長椅子', 'ながいす', 'ベンチ'], 'ソファ', 'sofa',
    'Ghế dài bằng gỗ, đệm ngồi và gối hoa.', [[80, 475, 480, 225]],
    { 'ソファー': ['ソファー', 'sofaa'], '長椅子': ['ながいす', 'nagaisu'], 'ながいす': ['ながいす', 'nagaisu'], 'ベンチ': ['ベンチ', 'benchi'] }),
  L('armchair', 'Ghế bành', ['armchair', 'chair', 'easy chair'], ['肘掛け椅子', 'ひじかけいす', 'アームチェア', '椅子', 'いす'], 'ひじかけいす', 'hijikakeisu',
    'Ghế bành gỗ có tay vịn, đặt cạnh bàn trà.', [[80, 660, 555, 281]],
    { 'アームチェア': ['アームチェア', 'aamuchea'], '椅子': ['いす', 'isu'], 'いす': ['いす', 'isu'] }),
  L('table', 'Bàn trà', ['coffee table', 'tea table', 'table', 'low table'], ['テーブル', 'てーぶる', 'ローテーブル', '座卓', 'ざたく'], 'テーブル', 'teeburu',
    'Bàn gỗ thấp để tiếp khách và uống trà.', [[440, 585, 395, 260]],
    { 'てーぶる': ['テーブル', 'teeburu'], 'ローテーブル': ['ローテーブル', 'roteeburu'], '座卓': ['ざたく', 'zataku'], 'ざたく': ['ざたく', 'zataku'] }),
  L('window', 'Cửa sổ', ['window'], ['窓', 'まど'], 'まど', 'mado',
    'Cửa sổ song gỗ, rèm tre cuốn lên đón nắng.', [[210, 100, 225, 375]]),
  L('door', 'Cửa ra vào', ['door'], ['ドア', 'どあ', '扉', 'とびら'], 'ドア', 'doa',
    'Hai cánh cửa gỗ sơn xanh mở ra sân.', [[1062, 200, 60, 400], [1434, 185, 56, 432]],
    { 'どあ': ['ドア', 'doa'], '扉': ['とびら', 'tobira'], 'とびら': ['とびら', 'tobira'] }),
  L('tvstand', 'Kệ tivi', ['tv stand', 'tv cabinet', 'television stand', 'tv table'], ['テレビ台', 'てれびだい'], 'テレビだい', 'terebidai',
    'Kệ gỗ thấp đặt tivi và đài.', [[528, 465, 238, 100]], { 'てれびだい': ['テレビだい', 'terebidai'] }),
  L('plant', 'Chậu cây', ['plant', 'houseplant', 'potted plant'], ['観葉植物', 'かんようしょくぶつ', '植物', 'しょくぶつ', '鉢植え', 'はちうえ'], 'かんようしょくぶつ', 'kanyou shokubutsu',
    'Chậu cây xanh làm mát mắt cho căn phòng.', [[970, 448, 110, 157], [0, 440, 105, 210], [0, 725, 110, 216]],
    { '植物': ['しょくぶつ', 'shokubutsu'], 'しょくぶつ': ['しょくぶつ', 'shokubutsu'], '鉢植え': ['はちうえ', 'hachiue'], 'はちうえ': ['はちうえ', 'hachiue'] }),
  L('jar', 'Cái chum', ['jar', 'clay jar', 'urn'], ['壺', 'つぼ', '甕', 'かめ'], 'つぼ', 'tsubo',
    'Chum sành lớn đặt cạnh cửa.', [[1530, 630, 142, 311]], { '甕': ['かめ', 'kame'], 'かめ': ['かめ', 'kame'] }),
  L('stool', 'Ghế đẩu', ['stool'], ['スツール', '腰掛け', 'こしかけ', '椅子', 'いす'], 'スツール', 'sutsuuru',
    'Ghế đẩu gỗ nhỏ, ngồi gần bàn trà.', [[870, 615, 130, 155], [815, 662, 150, 190]],
    { '腰掛け': ['こしかけ', 'koshikake'], 'こしかけ': ['こしかけ', 'koshikake'], '椅子': ['いす', 'isu'], 'いす': ['いす', 'isu'] }),
  L('tv', 'Cái tivi', ['tv', 'television', 'tv set', 'television set'], ['テレビ', 'てれび'], 'テレビ', 'terebi',
    'Chiếc tivi cũ phủ khăn ren.', [[548, 380, 145, 90]], { 'てれび': ['テレビ', 'terebi'] }),
  L('clock', 'Đồng hồ treo tường', ['clock', 'wall clock'], ['時計', 'とけい', '掛け時計', 'かけどけい'], 'とけい', 'tokei',
    'Đồng hồ quả lắc treo trên tường.', [[648, 208, 60, 88]], { '掛け時計': ['かけどけい', 'kakedokei'], 'かけどけい': ['かけどけい', 'kakedokei'] }),
  L('radio', 'Cái đài', ['radio'], ['ラジオ', 'らじお'], 'ラジオ', 'rajio',
    'Chiếc đài nhỏ đặt cạnh tivi.', [[698, 430, 58, 38]], { 'らじお': ['ラジオ', 'rajio'] }),
  L('altar', 'Bàn thờ', ['altar', 'family altar', 'ancestor altar'], ['祭壇', 'さいだん', '仏壇', 'ぶつだん'], 'さいだん', 'saidan',
    'Bàn thờ gia tiên với hoa quả và lư hương.', [[820, 285, 150, 75]], { '仏壇': ['ぶつだん', 'butsudan'], 'ぶつだん': ['ぶつだん', 'butsudan'] }),
  L('fu', 'Chữ Phúc', ['fortune', 'good fortune', 'luck', 'good luck', 'blessing'], ['福', 'ふく'], 'ふく', 'fuku',
    'Chữ 福 (Phúc) mang ý nghĩa may mắn, thường treo trong nhà dịp Tết.', [[838, 192, 120, 100]]),
  L('painting', 'Bức tranh', ['picture', 'painting'], ['絵', 'え', '絵画', 'かいが'], 'え', 'e',
    'Bức tranh phong cảnh treo trên tường.', [[0, 72, 115, 185], [440, 243, 42, 88]], { '絵画': ['かいが', 'kaiga'], 'かいが': ['かいが', 'kaiga'] }),
  L('photos', 'Khung ảnh', ['photo', 'photos', 'photo frame', 'picture frame', 'photograph'], ['写真', 'しゃしん', '写真立て', 'しゃしんたて'], 'しゃしん', 'shashin',
    'Ảnh gia đình đặt trên kệ.', [[650, 360, 48, 62], [693, 362, 48, 52]], { '写真立て': ['しゃしんたて', 'shashintate'], 'しゃしんたて': ['しゃしんたて', 'shashintate'] }),
  L('calendar', 'Tờ lịch', ['calendar'], ['カレンダー', 'かれんだー'], 'カレンダー', 'karendaa',
    'Lịch treo tường ghi ngày tháng.', [[8, 270, 85, 170]], { 'かれんだー': ['カレンダー', 'karendaa'] }),
  L('broom', 'Cái chổi', ['broom'], ['ほうき', '箒', 'ホウキ'], 'ほうき', 'houki',
    'Chổi tre dựng cạnh cửa để quét sân.', [[1452, 360, 80, 280]]),
  L('hat', 'Nón lá', ['conical hat', 'non la', 'hat', 'vietnamese hat', 'straw hat'], ['笠', 'かさ', 'ノンラー', '帽子', 'ぼうし'], 'かさ', 'kasa',
    'Chiếc nón lá quen thuộc của người Việt.', [[1562, 208, 75, 150]], { 'ノンラー': ['ノンラー', 'nonraa'], '帽子': ['ぼうし', 'boushi'], 'ぼうし': ['ぼうし', 'boushi'] }),
  L('slippers', 'Đôi dép', ['sandals', 'slippers', 'sandal', 'slipper'], ['サンダル', 'さんだる', 'スリッパ', 'すりっぱ'], 'サンダル', 'sandaru',
    'Dép để ngoài cửa, vào nhà thì cởi ra.', [[1380, 605, 70, 35]], { 'さんだる': ['サンダル', 'sandaru'], 'スリッパ': ['スリッパ', 'surippa'], 'すりっぱ': ['スリッパ', 'surippa'] }),
  L('basket', 'Cái rổ', ['basket', 'bamboo basket'], ['籠', 'かご', 'カゴ', 'バスケット'], 'かご', 'kago',
    'Rổ tre nhỏ đặt cạnh cửa.', [[1500, 595, 70, 80]], { 'バスケット': ['バスケット', 'basuketto'] }),
  L('vase', 'Lọ hoa', ['vase', 'flower vase'], ['花瓶', 'かびん'], 'かびん', 'kabin',
    'Lọ sứ xanh trắng cắm hoa tươi.', [[655, 480, 105, 130], [1575, 400, 97, 135], [0, 582, 55, 90], [440, 438, 62, 52]]),
  L('teapot', 'Ấm trà', ['teapot', 'tea pot'], ['急須', 'きゅうす', 'ティーポット'], 'きゅうす', 'kyuusu',
    'Ấm sứ trên khay trà.', [[618, 562, 62, 52]], { 'ティーポット': ['ティーポット', 'tiipotto'] }),
  L('cup', 'Tách trà', ['teacup', 'tea cup', 'cup'], ['湯呑み', '湯呑', 'ゆのみ', 'カップ', 'コップ'], 'ゆのみ', 'yunomi',
    'Tách trà nhỏ cạnh ấm.', [[667, 586, 34, 28]], { 'カップ': ['カップ', 'kappu'], 'コップ': ['コップ', 'koppu'] }),
  L('cushion', 'Cái gối tựa', ['cushion', 'pillow'], ['クッション', 'くっしょん', '枕', 'まくら'], 'クッション', 'kusshon',
    'Gối tựa thêu hoa trên ghế dài.', [[240, 525, 115, 90], [325, 510, 105, 90]], { 'くっしょん': ['クッション', 'kusshon'], '枕': ['まくら', 'makura'], 'まくら': ['まくら', 'makura'] }),
  L('chicken', 'Con gà', ['chicken', 'hen'], ['鶏', 'にわとり', 'ニワトリ'], 'にわとり', 'niwatori',
    'Gà đang đi dạo ngoài sân.', [[1272, 518, 40, 32]])
);

/* Các nhóm trong sổ tay. Thêm phòng mới (ví dụ phòng khách) bằng cách thêm một nhóm ở đây
 * và thêm đồ vật tương ứng vào VOCAB. Nhóm không có đồ vật nào sẽ không hiện trong sổ tay. */
const CATEGORIES = [
  { id: 'bep', name: 'Nhà bếp', room: 'bep', ids: ['pot', 'pan', 'bowl', 'chopsticks', 'cup', 'teapot', 'bottles', 'faucet', 'towel', 'fridge', 'cabinet', 'basket', 'chili', 'garlic'] },
  { id: 'phongan', name: 'Phòng ăn', room: 'bep', ids: ['table', 'stool', 'lamp', 'window', 'vase', 'plant'] },
  { id: 'san', name: 'Sân vườn', room: 'bep', ids: ['chicken', 'corn', 'banana', 'field', 'jar', 'bucket'] },
  { id: 'khach', name: 'Phòng khách', room: 'khach', ids: ['lv_sofa', 'lv_armchair', 'lv_table', 'lv_stool', 'lv_cushion', 'lv_rug', 'lv_tv', 'lv_tvstand', 'lv_radio', 'lv_cabinet', 'lv_altar', 'lv_fu', 'lv_clock', 'lv_painting', 'lv_photos', 'lv_calendar', 'lv_teapot', 'lv_cup', 'lv_vase', 'lv_plant', 'lv_window', 'lv_broom', 'lv_hat', 'lv_slippers', 'lv_basket', 'lv_jar'] },
  { id: 'hien', name: 'Ngoài cửa', room: 'khach', ids: ['lv_door', 'lv_tree', 'lv_field', 'lv_fence', 'lv_chicken'] }
];
