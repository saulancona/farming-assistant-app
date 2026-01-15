// Quiz data for knowledge articles
// Each article has its own unique quiz with 4 questions
// User must get at least 3 correct to complete the article

export interface QuizQuestion {
  question: string;
  questionSw: string; // Swahili translation
  options: string[];
  optionsSw: string[];
  correctIndex: number;
}

export interface ArticleQuiz {
  articleId: string;
  articleTitle: string; // Pattern to match article titles
  questions: QuizQuestion[];
}

// Each quiz is specifically designed for a particular article's content
export const articleQuizzes: ArticleQuiz[] = [
  // ============================================
  // MAIZE PLANTING GUIDES
  // ============================================
  {
    articleId: 'maize-planting-guide',
    articleTitle: 'complete guide to maize|maize planting',
    questions: [
      {
        question: 'What is the recommended spacing between maize rows?',
        questionSw: 'Nafasi inayopendekezwa kati ya mistari ya mahindi ni ipi?',
        options: ['50cm', '75cm', '100cm', '120cm'],
        optionsSw: ['Sm 50', 'Sm 75', 'Sm 100', 'Sm 120'],
        correctIndex: 1,
      },
      {
        question: 'How deep should maize seeds be planted?',
        questionSw: 'Mbegu za mahindi zinapaswa kupandwa kwa kina gani?',
        options: ['1-2cm', '3-4cm', '5-7cm', '10-12cm'],
        optionsSw: ['Sm 1-2', 'Sm 3-4', 'Sm 5-7', 'Sm 10-12'],
        correctIndex: 2,
      },
      {
        question: 'When should top dressing fertilizer (CAN) be applied to maize?',
        questionSw: 'Mbolea ya CAN inapaswa kuwekwa lini kwa mahindi?',
        options: ['At planting time', 'When plants are knee-high (4-6 weeks)', 'During flowering', 'At harvest'],
        optionsSw: ['Wakati wa kupanda', 'Mimea ifikapo kimo cha goti (wiki 4-6)', 'Wakati wa kutoa maua', 'Wakati wa mavuno'],
        correctIndex: 1,
      },
      {
        question: 'What is the expected yield with good maize management?',
        questionSw: 'Mavuno yanayotarajiwa na usimamizi mzuri wa mahindi ni kiasi gani?',
        options: ['1-2 tons/hectare', '3-4 tons/hectare', '6-8 tons/hectare', '12-15 tons/hectare'],
        optionsSw: ['Tani 1-2/hekta', 'Tani 3-4/hekta', 'Tani 6-8/hekta', 'Tani 12-15/hekta'],
        correctIndex: 2,
      },
    ],
  },
  {
    articleId: 'best-time-maize',
    articleTitle: 'best time to plant maize|optimal maize planting',
    questions: [
      {
        question: 'When is the Long Rains season in East Africa?',
        questionSw: 'Mvua za masika hunyesha lini Afrika Mashariki?',
        options: ['January-February', 'March-May', 'June-August', 'September-October'],
        optionsSw: ['Januari-Februari', 'Machi-Mei', 'Juni-Agosti', 'Septemba-Oktoba'],
        correctIndex: 1,
      },
      {
        question: 'What is the ideal soil pH range for maize?',
        questionSw: 'Kiwango bora cha pH ya udongo kwa mahindi ni kipi?',
        options: ['3.0-4.5', '5.5-7.0', '8.0-9.5', '10.0-11.0'],
        optionsSw: ['3.0-4.5', '5.5-7.0', '8.0-9.5', '10.0-11.0'],
        correctIndex: 1,
      },
      {
        question: 'How many weeks before planting should land preparation begin?',
        questionSw: 'Wiki ngapi kabla ya kupanda unapaswa kuanza kuandaa shamba?',
        options: ['1 week', '2-3 weeks', '6-8 weeks', 'Same day'],
        optionsSw: ['Wiki 1', 'Wiki 2-3', 'Wiki 6-8', 'Siku hiyo hiyo'],
        correctIndex: 1,
      },
      {
        question: 'During which weeks after planting is weed control most critical for maize?',
        questionSw: 'Wiki zipi baada ya kupanda kudhibiti magugu ni muhimu zaidi kwa mahindi?',
        options: ['Weeks 1-2', 'First 6 weeks', 'Weeks 8-12', 'At harvest time'],
        optionsSw: ['Wiki 1-2', 'Wiki 6 za kwanza', 'Wiki 8-12', 'Wakati wa mavuno'],
        correctIndex: 1,
      },
    ],
  },

  // ============================================
  // CASSAVA GUIDE
  // ============================================
  {
    articleId: 'cassava-growing',
    articleTitle: 'cassava growing|cassava guide',
    questions: [
      {
        question: 'What is the optimal length for cassava stem cuttings?',
        questionSw: 'Urefu bora wa vipandikizi vya muhogo ni upi?',
        options: ['5-10cm', '20-25cm', '40-50cm', '60-70cm'],
        optionsSw: ['Sm 5-10', 'Sm 20-25', 'Sm 40-50', 'Sm 60-70'],
        correctIndex: 1,
      },
      {
        question: 'At what angle should cassava cuttings be planted?',
        questionSw: 'Vipandikizi vya muhogo vinapaswa kupandwa kwa pembe gani?',
        options: ['Vertical (90°)', '45° angle', 'Horizontal (flat)', 'It doesn\'t matter'],
        optionsSw: ['Wima (90°)', 'Pembe ya 45°', 'Mlalo (chini)', 'Haijalishi'],
        correctIndex: 1,
      },
      {
        question: 'What is the minimum time before cassava can be harvested?',
        questionSw: 'Muda wa chini kabla ya muhogo kuvunwa ni upi?',
        options: ['3 months', '6 months', '9 months', '18 months'],
        optionsSw: ['Miezi 3', 'Miezi 6', 'Miezi 9', 'Miezi 18'],
        correctIndex: 2,
      },
      {
        question: 'How should harvested cassava roots be handled?',
        questionSw: 'Mizizi ya muhogo iliyovunwa inapaswa kushughulikiwa vipi?',
        options: ['Store for 2 weeks before processing', 'Process within 2-3 days', 'Freeze immediately', 'Dry in sun for 1 week'],
        optionsSw: ['Hifadhi wiki 2 kabla ya kusindika', 'Sindika ndani ya siku 2-3', 'Ganda mara moja', 'Kausha juani wiki 1'],
        correctIndex: 1,
      },
    ],
  },

  // ============================================
  // BEANS GUIDE
  // ============================================
  {
    articleId: 'beans-growing',
    articleTitle: 'growing beans|beans guide|bean planting',
    questions: [
      {
        question: 'What is the seed rate for bush beans per hectare?',
        questionSw: 'Kiwango cha mbegu kwa maharagwe ya kichaka kwa hekta ni kipi?',
        options: ['10-15kg', '30-40kg', '60-80kg', '100-120kg'],
        optionsSw: ['Kg 10-15', 'Kg 30-40', 'Kg 60-80', 'Kg 100-120'],
        correctIndex: 1,
      },
      {
        question: 'What is the recommended planting depth for beans?',
        questionSw: 'Kina kinachopendekezwa cha kupanda maharagwe ni kipi?',
        options: ['1-2cm', '3-5cm', '8-10cm', '12-15cm'],
        optionsSw: ['Sm 1-2', 'Sm 3-5', 'Sm 8-10', 'Sm 12-15'],
        correctIndex: 1,
      },
      {
        question: 'What moisture level should dry beans be stored at?',
        questionSw: 'Maharagwe makavu yanapaswa kuhifadhiwa katika kiwango gani cha unyevu?',
        options: ['5-8%', '12-13%', '18-20%', '25-30%'],
        optionsSw: ['5-8%', '12-13%', '18-20%', '25-30%'],
        correctIndex: 1,
      },
      {
        question: 'What do beans contribute to the soil when intercropped with maize?',
        questionSw: 'Maharagwe yanachangia nini kwenye udongo yanapopandwa na mahindi?',
        options: ['Potassium', 'Nitrogen fixation', 'Phosphorus', 'Calcium'],
        optionsSw: ['Potasiamu', 'Kurekebisha nitrojeni', 'Fosforasi', 'Kalsiamu'],
        correctIndex: 1,
      },
    ],
  },

  // ============================================
  // SWEET POTATO GUIDE
  // ============================================
  {
    articleId: 'sweet-potato-production',
    articleTitle: 'sweet potato production|sweet potato guide',
    questions: [
      {
        question: 'What is the recommended vine cutting length for sweet potato planting?',
        questionSw: 'Urefu unaoshauriwa wa kipandikizi cha mzabibu wa viazi vitamu ni upi?',
        options: ['10-15cm', '25-30cm', '45-50cm', '60-70cm'],
        optionsSw: ['Sm 10-15', 'Sm 25-30', 'Sm 45-50', 'Sm 60-70'],
        correctIndex: 1,
      },
      {
        question: 'What is the spacing between sweet potato ridges?',
        questionSw: 'Nafasi kati ya matuta ya viazi vitamu ni ipi?',
        options: ['30cm', '50cm', '1 meter', '2 meters'],
        optionsSw: ['Sm 30', 'Sm 50', 'Mita 1', 'Mita 2'],
        correctIndex: 2,
      },
      {
        question: 'Which sweet potato variety is high in Vitamin A?',
        questionSw: 'Aina gani ya viazi vitamu ina vitamini A nyingi?',
        options: ['White-fleshed varieties', 'Orange-fleshed varieties (OFSP)', 'Purple varieties', 'Yellow varieties'],
        optionsSw: ['Aina nyeupe', 'Aina ya rangi ya machungwa (OFSP)', 'Aina ya zambarau', 'Aina ya njano'],
        correctIndex: 1,
      },
      {
        question: 'What is the most serious pest affecting sweet potatoes?',
        questionSw: 'Mdudu hatari zaidi anayeathiri viazi vitamu ni yupi?',
        options: ['Aphids', 'Caterpillars', 'Sweet potato weevil', 'Grasshoppers'],
        optionsSw: ['Vidukari', 'Viwavi', 'Fukusi wa viazi vitamu', 'Panzi'],
        correctIndex: 2,
      },
    ],
  },

  // ============================================
  // ORGANIC PEST CONTROL
  // ============================================
  {
    articleId: 'organic-pest-control',
    articleTitle: 'organic pest control|natural pest',
    questions: [
      {
        question: 'What is the correct mixture for neem oil spray?',
        questionSw: 'Mchanganyiko sahihi wa dawa ya mafuta ya mwarobaini ni upi?',
        options: ['1 tsp neem + 5L water', '2 tbsp neem + 1L water + liquid soap', '1 cup neem + 500ml water', 'Pure neem oil undiluted'],
        optionsSw: ['Kijiko 1 mwarobaini + lita 5 maji', 'Vijiko 2 mwarobaini + lita 1 maji + sabuni', 'Kikombe 1 mwarobaini + ml 500 maji', 'Mafuta safi bila kuchanganya'],
        correctIndex: 1,
      },
      {
        question: 'Which plant can be used as a companion plant to repel aphids?',
        questionSw: 'Mmea gani unaweza kutumika kama mwenzake kufukuza vidukari?',
        options: ['Maize', 'Marigolds', 'Cassava', 'Rice'],
        optionsSw: ['Mahindi', 'Marigold', 'Muhogo', 'Mchele'],
        correctIndex: 1,
      },
      {
        question: 'What is Bacillus thuringiensis (Bt) used to control?',
        questionSw: 'Bacillus thuringiensis (Bt) inatumika kudhibiti nini?',
        options: ['Weeds', 'Fungal diseases', 'Caterpillars', 'Nematodes'],
        optionsSw: ['Magugu', 'Magonjwa ya ukungu', 'Viwavi', 'Nematodi'],
        correctIndex: 2,
      },
      {
        question: 'How often should you inspect crops for pests?',
        questionSw: 'Mara ngapi unapaswa kukagua mazao yako kwa wadudu?',
        options: ['Once per season', 'Monthly', 'Regularly/weekly', 'Only when damage is visible'],
        optionsSw: ['Mara moja kwa msimu', 'Kila mwezi', 'Mara kwa mara/kila wiki', 'Unapoona uharibifu tu'],
        correctIndex: 2,
      },
    ],
  },

  // ============================================
  // DRIP IRRIGATION
  // ============================================
  {
    articleId: 'drip-irrigation',
    articleTitle: 'drip irrigation|water-efficient',
    questions: [
      {
        question: 'How much water can drip irrigation save compared to traditional methods?',
        questionSw: 'Umwagiliaji wa matone unaweza kuokoa maji kiasi gani ikilinganishwa na njia za kawaida?',
        options: ['5-10%', '15-20%', '30-50%', '70-80%'],
        optionsSw: ['5-10%', '15-20%', '30-50%', '70-80%'],
        correctIndex: 2,
      },
      {
        question: 'What component prevents drip lines from clogging?',
        questionSw: 'Sehemu gani inazuia njia za matone kuziba?',
        options: ['Pressure regulator', 'Filter', 'Timer', 'Valve'],
        optionsSw: ['Kidhibiti shinikizo', 'Kichujio', 'Kipima muda', 'Vali'],
        correctIndex: 1,
      },
      {
        question: 'How often should drip irrigation lines be flushed?',
        questionSw: 'Mara ngapi njia za umwagiliaji wa matone zinapaswa kusafishwa?',
        options: ['Once a year', 'Weekly', 'Once every 3 months', 'Never'],
        optionsSw: ['Mara moja kwa mwaka', 'Kila wiki', 'Kila miezi 3', 'Kamwe'],
        correctIndex: 1,
      },
      {
        question: 'What is the approximate cost of a basic gravity drip system for 0.25 acre?',
        questionSw: 'Gharama ya mfumo wa msingi wa umwagiliaji wa matone kwa eka 0.25 ni kiasi gani?',
        options: ['$50-100', '$150-300', '$500-700', '$1000+'],
        optionsSw: ['$50-100', '$150-300', '$500-700', '$1000+'],
        correctIndex: 1,
      },
    ],
  },

  // ============================================
  // POST-HARVEST HANDLING
  // ============================================
  {
    articleId: 'post-harvest-handling',
    articleTitle: 'post-harvest handling|proper harvest|harvest handling',
    questions: [
      {
        question: 'What is the target moisture content for storing grains like maize and beans?',
        questionSw: 'Kiwango cha unyevu kinachoshauriwa kwa kuhifadhi nafaka kama mahindi na maharagwe ni kipi?',
        options: ['5-8%', '13-14%', '20-25%', '30-35%'],
        optionsSw: ['5-8%', '13-14%', '20-25%', '30-35%'],
        correctIndex: 1,
      },
      {
        question: 'When is the best time of day to harvest crops?',
        questionSw: 'Wakati gani wa siku ni bora kuvuna mazao?',
        options: ['Midday (hottest)', 'Early morning (cool)', 'Late night', 'Any time'],
        optionsSw: ['Mchana (joto kali)', 'Asubuhi mapema (baridi)', 'Usiku wa manane', 'Wakati wowote'],
        correctIndex: 1,
      },
      {
        question: 'How much can good post-harvest practices reduce losses?',
        questionSw: 'Mazoea mazuri ya baada ya mavuno yanaweza kupunguza upotevu kwa kiasi gani?',
        options: ['Up to 10%', 'Up to 25%', 'Up to 50%', 'Up to 75%'],
        optionsSw: ['Hadi 10%', 'Hadi 25%', 'Hadi 50%', 'Hadi 75%'],
        correctIndex: 2,
      },
      {
        question: 'What type of bags are recommended for long-term grain storage?',
        questionSw: 'Aina gani ya mifuko inashauriwa kwa uhifadhi wa muda mrefu wa nafaka?',
        options: ['Open woven bags', 'Hermetic (airtight) bags', 'Paper bags', 'Plastic shopping bags'],
        optionsSw: ['Mifuko ya wazi iliyofumwa', 'Mifuko isiyopitisha hewa', 'Mifuko ya karatasi', 'Mifuko ya plastiki ya dukani'],
        correctIndex: 1,
      },
    ],
  },

  // ============================================
  // MARKET PRICES AND NEGOTIATION
  // ============================================
  {
    articleId: 'market-prices-negotiation',
    articleTitle: 'market prices|understanding market|negotiation',
    questions: [
      {
        question: 'How many years of price trends should you study before planting?',
        questionSw: 'Miaka mingapi ya mwenendo wa bei unapaswa kusoma kabla ya kupanda?',
        options: ['1 year', '3 years', '5 years', '10 years'],
        optionsSw: ['Mwaka 1', 'Miaka 3', 'Miaka 5', 'Miaka 10'],
        correctIndex: 1,
      },
      {
        question: 'What is "value addition" in agriculture?',
        questionSw: '"Kuongeza thamani" katika kilimo ni nini?',
        options: ['Adding more fertilizer', 'Processing raw produce to increase its value', 'Growing more crops', 'Hiring more workers'],
        optionsSw: ['Kuongeza mbolea', 'Kusindika mazao ghafi kuongeza thamani yake', 'Kupanda mazao zaidi', 'Kuajiri wafanyakazi zaidi'],
        correctIndex: 1,
      },
      {
        question: 'What is a key benefit of joining a farmer group for marketing?',
        questionSw: 'Faida kuu ya kujiunga na kikundi cha wakulima kwa masoko ni ipi?',
        options: ['Free seeds', 'Better bargaining power and bulk sales', 'Less work', 'Government subsidies'],
        optionsSw: ['Mbegu bure', 'Nguvu bora ya majadiliano na mauzo ya jumla', 'Kazi kidogo', 'Ruzuku ya serikali'],
        correctIndex: 1,
      },
      {
        question: 'How often should you monitor market prices during growing season?',
        questionSw: 'Mara ngapi unapaswa kufuatilia bei za soko wakati wa msimu wa kukua?',
        options: ['Once at harvest', 'Weekly', 'Once a month', 'Never'],
        optionsSw: ['Mara moja wakati wa mavuno', 'Kila wiki', 'Mara moja kwa mwezi', 'Kamwe'],
        correctIndex: 1,
      },
    ],
  },

  // ============================================
  // SOIL HEALTH
  // ============================================
  {
    articleId: 'soil-health-compost',
    articleTitle: 'soil|compost|fertilizer|nutrient|organic matter',
    questions: [
      {
        question: 'What is the ideal soil pH range for most crops?',
        questionSw: 'Kiwango bora cha pH ya udongo kwa mazao mengi ni kipi?',
        options: ['4.0-5.0', '6.0-7.0', '8.0-9.0', '10.0-11.0'],
        optionsSw: ['4.0-5.0', '6.0-7.0', '8.0-9.0', '10.0-11.0'],
        correctIndex: 1,
      },
      {
        question: 'What indicates healthy soil?',
        questionSw: 'Nini kinaonyesha udongo una afya?',
        options: ['Dry and cracked', 'Presence of earthworms and dark color', 'White color', 'No vegetation'],
        optionsSw: ['Mkavu na unaopasuka', 'Kuwepo kwa minyoo na rangi nyeusi', 'Rangi nyeupe', 'Hakuna mimea'],
        correctIndex: 1,
      },
      {
        question: 'What do legumes contribute to soil fertility?',
        questionSw: 'Mikunde inachangia nini kwa rutuba ya udongo?',
        options: ['Remove nutrients', 'Fix nitrogen from air into soil', 'Add acidity', 'Nothing'],
        optionsSw: ['Kuondoa virutubisho', 'Kurekebisha nitrojeni kutoka hewani kwenye udongo', 'Kuongeza tindikali', 'Hakuna'],
        correctIndex: 1,
      },
      {
        question: 'What is the recommended ploughing depth for soil preparation?',
        questionSw: 'Kina kinachopendekezwa cha kulima kwa maandalizi ya udongo ni kipi?',
        options: ['5cm', '10cm', '20cm', '50cm'],
        optionsSw: ['Sm 5', 'Sm 10', 'Sm 20', 'Sm 50'],
        correctIndex: 2,
      },
    ],
  },

  // ============================================
  // CROP ROTATION
  // ============================================
  {
    articleId: 'crop-rotation-practices',
    articleTitle: 'crop rotation|rotation|best practices',
    questions: [
      {
        question: 'In a 4-year crop rotation plan, what type of crop should follow maize (a heavy feeder)?',
        questionSw: 'Katika mpango wa mzunguko wa miaka 4, aina gani ya zao inafaa kufuata mahindi?',
        options: ['More maize', 'Beans or legumes (nitrogen fixers)', 'Another heavy feeder', 'Leave fallow'],
        optionsSw: ['Mahindi zaidi', 'Maharagwe au mikunde (wanaorekebishanitrojeni)', 'Mlaji mwingine mkubwa', 'Acha bila kupanda'],
        correctIndex: 1,
      },
      {
        question: 'Why is crop rotation important?',
        questionSw: 'Kwa nini mzunguko wa mazao ni muhimu?',
        options: ['Uses more seeds', 'Improves soil nutrients and prevents disease buildup', 'Looks nicer', 'Requires less work'],
        optionsSw: ['Hutumia mbegu zaidi', 'Huboresha virutubisho vya udongo na kuzuia mrundikano wa magonjwa', 'Inaonekana vizuri', 'Inahitaji kazi kidogo'],
        correctIndex: 1,
      },
      {
        question: 'What is a good intercropping combination mentioned in farming best practices?',
        questionSw: 'Mchanganyiko gani mzuri wa kupanda pamoja unaotajwa katika mazoea bora ya kilimo?',
        options: ['Maize + Rice', 'Maize + Beans', 'Wheat + Cassava', 'Potatoes + Bananas'],
        optionsSw: ['Mahindi + Mchele', 'Mahindi + Maharagwe', 'Ngano + Muhogo', 'Viazi + Ndizi'],
        correctIndex: 1,
      },
      {
        question: 'What records should farmers keep for good farm management?',
        questionSw: 'Rekodi gani wakulima wanapaswa kuweka kwa usimamizi mzuri wa shamba?',
        options: ['Only yields', 'Inputs, costs, yields, and weather conditions', 'Only expenses', 'None needed'],
        optionsSw: ['Mavuno tu', 'Pembejeo, gharama, mavuno, na hali ya hewa', 'Gharama tu', 'Hakuna zinazohitajika'],
        correctIndex: 1,
      },
    ],
  },

  // ============================================
  // TOMATO GROWING
  // ============================================
  {
    articleId: 'tomato-growing',
    articleTitle: 'tomato|tomatoes',
    questions: [
      {
        question: 'What is the recommended spacing for tomato plants?',
        questionSw: 'Nafasi inayoshauriwa kwa mimea ya nyanya ni ipi?',
        options: ['30cm x 30cm', '60cm x 45cm', '100cm x 100cm', '15cm x 15cm'],
        optionsSw: ['Sm 30 x 30', 'Sm 60 x 45', 'Sm 100 x 100', 'Sm 15 x 15'],
        correctIndex: 1,
      },
      {
        question: 'Which plant can help repel tomato pests when planted nearby?',
        questionSw: 'Mmea gani unaweza kusaidia kufukuza wadudu wa nyanya unapopandwa karibu?',
        options: ['Maize', 'Basil or onions', 'Cassava', 'Rice'],
        optionsSw: ['Mahindi', 'Basil au vitunguu', 'Muhogo', 'Mchele'],
        correctIndex: 1,
      },
      {
        question: 'Can tomatoes be grown year-round with proper irrigation?',
        questionSw: 'Nyanya zinaweza kupandwa mwaka mzima na umwagiliaji sahihi?',
        options: ['No, only in rainy season', 'Yes, year-round with irrigation', 'Only in dry season', 'Only in winter'],
        optionsSw: ['Hapana, wakati wa mvua tu', 'Ndiyo, mwaka mzima na umwagiliaji', 'Kiangazi tu', 'Baridi tu'],
        correctIndex: 1,
      },
      {
        question: 'How should tomatoes be handled after harvest to maintain quality?',
        questionSw: 'Nyanya zinapaswa kushughulikiwa vipi baada ya kuvuna ili kudumisha ubora?',
        options: ['Wash immediately', 'Handle carefully to avoid bruising', 'Leave in direct sunlight', 'Stack in large piles'],
        optionsSw: ['Osha mara moja', 'Shughulikia kwa uangalifu kuepuka michubuko', 'Acha kwenye jua moja kwa moja', 'Rundo kwa marundo makubwa'],
        correctIndex: 1,
      },
    ],
  },

  // ============================================
  // GENERAL FARMING (FALLBACK)
  // ============================================
  {
    articleId: 'general-farming',
    articleTitle: 'farming|agriculture|general',
    questions: [
      {
        question: 'What is the first step in preparing land for planting?',
        questionSw: 'Hatua ya kwanza ya kuandaa shamba kwa kupanda ni ipi?',
        options: ['Apply fertilizer', 'Clear land and plough', 'Plant seeds', 'Water the field'],
        optionsSw: ['Weka mbolea', 'Safisha shamba na kulima', 'Panda mbegu', 'Mwagilia shamba'],
        correctIndex: 1,
      },
      {
        question: 'Why is it important to use certified seeds?',
        questionSw: 'Kwa nini ni muhimu kutumia mbegu zilizoidhinishwa?',
        options: ['They are cheaper', 'Higher germination rate and disease resistance', 'They grow faster', 'They need less water'],
        optionsSw: ['Ni za bei nafuu', 'Kiwango cha juu cha kuota na kustahimili magonjwa', 'Zinakua haraka', 'Zinahitaji maji kidogo'],
        correctIndex: 1,
      },
      {
        question: 'What is the benefit of early morning watering?',
        questionSw: 'Faida ya kumwagilia asubuhi mapema ni ipi?',
        options: ['Plants sleep better', 'Reduces water loss through evaporation', 'It is cooler for the farmer', 'No difference'],
        optionsSw: ['Mimea inalala vizuri', 'Inapunguza upotevu wa maji kwa uvukizi', 'Ni baridi kwa mkulima', 'Hakuna tofauti'],
        correctIndex: 1,
      },
      {
        question: 'What should you do before selling your produce at market?',
        questionSw: 'Nini unafaa kufanya kabla ya kuuza mazao yako sokoni?',
        options: ['Sell immediately without sorting', 'Clean, sort, and grade by quality', 'Mix all qualities together', 'Wait until produce is overripe'],
        optionsSw: ['Uza mara moja bila kupanga', 'Safisha, panga, na daraja kwa ubora', 'Changanya ubora wote pamoja', 'Subiri hadi mazao yawe yameiva sana'],
        correctIndex: 1,
      },
    ],
  },
];

// Function to find quiz for an article based on title or category
export function findQuizForArticle(articleTitle: string, articleCategory?: string): ArticleQuiz | null {
  const titleLower = articleTitle.toLowerCase();
  const categoryLower = (articleCategory || '').toLowerCase();

  // First, try to find a specific quiz that matches the article title
  for (const quiz of articleQuizzes) {
    const keywords = quiz.articleTitle.toLowerCase().split('|');
    for (const keyword of keywords) {
      if (titleLower.includes(keyword.trim())) {
        return quiz;
      }
    }
  }

  // If no title match, try to match by category
  const categoryQuizMap: Record<string, string> = {
    planting: 'general-farming',
    pest_control: 'organic-pest-control',
    irrigation: 'drip-irrigation',
    harvesting: 'post-harvest-handling',
    marketing: 'market-prices-negotiation',
    general: 'general-farming',
  };

  const fallbackQuizId = categoryQuizMap[categoryLower] || 'general-farming';
  return articleQuizzes.find(q => q.articleId === fallbackQuizId) || articleQuizzes[articleQuizzes.length - 1];
}
