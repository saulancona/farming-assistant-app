// Quiz data for knowledge articles
// Each article has 4 questions, user must get at least 3 correct to complete

export interface QuizQuestion {
  question: string;
  questionSw: string; // Swahili translation
  options: string[];
  optionsSw: string[];
  correctIndex: number;
}

export interface ArticleQuiz {
  articleId: string;
  articleTitle: string; // For matching articles by title if ID isn't available
  questions: QuizQuestion[];
}

// Generic farming quizzes that can be used based on article category/title keywords
export const articleQuizzes: ArticleQuiz[] = [
  // PLANTING CATEGORY
  {
    articleId: 'planting-spacing',
    articleTitle: 'spacing|seed depth|planting',
    questions: [
      {
        question: 'What is the recommended spacing between maize rows?',
        questionSw: 'Nafasi inayopendekezwa kati ya mistari ya mahindi ni ipi?',
        options: ['25cm', '50cm', '75cm', '100cm'],
        optionsSw: ['Sm 25', 'Sm 50', 'Sm 75', 'Sm 100'],
        correctIndex: 2,
      },
      {
        question: 'What is the recommended seed depth for beans?',
        questionSw: 'Kina cha mbegu kinachopendekezwa kwa maharagwe ni kipi?',
        options: ['1cm', '3-5cm', '10cm', '15cm'],
        optionsSw: ['Sm 1', 'Sm 3-5', 'Sm 10', 'Sm 15'],
        correctIndex: 1,
      },
      {
        question: 'When is the best time to water seedlings?',
        questionSw: 'Wakati gani mzuri wa kumwagilia miche?',
        options: ['Midday when sun is hottest', 'Early morning or late evening', 'Only when it rains', 'Once a week'],
        optionsSw: ['Mchana jua likali', 'Asubuhi mapema au jioni', 'Wakati wa mvua tu', 'Mara moja kwa wiki'],
        correctIndex: 1,
      },
      {
        question: 'Why is proper plant spacing important?',
        questionSw: 'Kwa nini nafasi sahihi ya mimea ni muhimu?',
        options: ['It looks nicer', 'Prevents disease spread and improves air circulation', 'It uses more seeds', 'Plants grow taller'],
        optionsSw: ['Inaonekana vizuri', 'Inazuia kuenea kwa magonjwa na kuboresha mzunguko wa hewa', 'Inatumia mbegu zaidi', 'Mimea inakua mirefu'],
        correctIndex: 1,
      },
    ],
  },
  {
    articleId: 'planting-seasons',
    articleTitle: 'season|timing|when to plant',
    questions: [
      {
        question: 'When do the Long Rains typically occur in East Africa?',
        questionSw: 'Mvua za masika hunyesha lini Afrika Mashariki?',
        options: ['January - February', 'March - May', 'July - August', 'October - December'],
        optionsSw: ['Januari - Februari', 'Machi - Mei', 'Julai - Agosti', 'Oktoba - Desemba'],
        correctIndex: 1,
      },
      {
        question: 'How many weeks before rains should you prepare land?',
        questionSw: 'Wiki ngapi kabla ya mvua unapaswa kuandaa shamba?',
        options: ['1 week', '2-3 weeks', '6 weeks', 'After rains start'],
        optionsSw: ['Wiki 1', 'Wiki 2-3', 'Wiki 6', 'Baada ya mvua kuanza'],
        correctIndex: 1,
      },
      {
        question: 'Which season is best for quick-maturing crop varieties?',
        questionSw: 'Msimu upi ni bora kwa aina za mazao yanayokomaa haraka?',
        options: ['Long Rains only', 'Short Rains (October-December)', 'Dry season', 'Any time'],
        optionsSw: ['Mvua za masika tu', 'Mvua za vuli (Oktoba-Desemba)', 'Kiangazi', 'Wakati wowote'],
        correctIndex: 1,
      },
      {
        question: 'What should you do when planting during Short Rains?',
        questionSw: 'Nini unafaa kufanya unapopanda wakati wa mvua za vuli?',
        options: ['Plant more seeds', 'Use drought-tolerant varieties', 'Plant deeper', 'Add more fertilizer'],
        optionsSw: ['Panda mbegu zaidi', 'Tumia aina zinazostahimili ukame', 'Panda kwa kina zaidi', 'Ongeza mbolea zaidi'],
        correctIndex: 1,
      },
    ],
  },
  // GENERAL/BEST PRACTICES
  {
    articleId: 'best-practices',
    articleTitle: 'best practice|crop rotation|soil preparation|yield',
    questions: [
      {
        question: 'What is the ideal soil pH for most crops?',
        questionSw: 'pH ya udongo bora kwa mazao mengi ni ipi?',
        options: ['4.0-5.0', '6.0-7.0', '8.0-9.0', '10.0-11.0'],
        optionsSw: ['4.0-5.0', '6.0-7.0', '8.0-9.0', '10.0-11.0'],
        correctIndex: 1,
      },
      {
        question: 'Why should you rotate crops annually?',
        questionSw: 'Kwa nini unapaswa kubadilisha mazao kila mwaka?',
        options: ['To confuse pests', 'To improve soil nutrients and prevent disease buildup', 'To use different seeds', 'It is not necessary'],
        optionsSw: ['Kuchanganya wadudu', 'Kuboresha virutubisho vya udongo na kuzuia mrundikano wa magonjwa', 'Kutumia mbegu tofauti', 'Si lazima'],
        correctIndex: 1,
      },
      {
        question: 'What crop should follow maize in rotation?',
        questionSw: 'Zao gani linafaa kufuata mahindi katika mzunguko?',
        options: ['More maize', 'Beans or other legumes', 'Wheat', 'Rice'],
        optionsSw: ['Mahindi zaidi', 'Maharagwe au mikunde mingine', 'Ngano', 'Mchele'],
        correctIndex: 1,
      },
      {
        question: 'How deep should you plough the soil before planting?',
        questionSw: 'Unafaa kulima udongo kwa kina gani kabla ya kupanda?',
        options: ['5cm', '10cm', '20cm', '50cm'],
        optionsSw: ['Sm 5', 'Sm 10', 'Sm 20', 'Sm 50'],
        correctIndex: 2,
      },
    ],
  },
  // PEST CONTROL
  {
    articleId: 'pest-control-natural',
    articleTitle: 'pest|insect|natural|organic|control',
    questions: [
      {
        question: 'What is a natural way to control aphids?',
        questionSw: 'Njia ya asili ya kudhibiti vidukari ni ipi?',
        options: ['Burn the field', 'Introduce ladybugs or use neem oil', 'Ignore them', 'Use more fertilizer'],
        optionsSw: ['Choma shamba', 'Leta mdudu ladybug au tumia mafuta ya mwarobaini', 'Wapuuze', 'Tumia mbolea zaidi'],
        correctIndex: 1,
      },
      {
        question: 'Why is companion planting effective for pest control?',
        questionSw: 'Kwa nini kupanda mimea pamoja ni nzuri kwa kudhibiti wadudu?',
        options: ['It uses more land', 'Some plants repel pests that attack others', 'It looks better', 'It is easier to harvest'],
        optionsSw: ['Inatumia ardhi zaidi', 'Mimea mingine inafukuza wadudu wanaoshambulia mingine', 'Inaonekana vizuri', 'Ni rahisi kuvuna'],
        correctIndex: 1,
      },
      {
        question: 'What plant can help repel tomato pests?',
        questionSw: 'Mmea gani unaweza kusaidia kufukuza wadudu wa nyanya?',
        options: ['Maize', 'Basil or marigolds', 'Rice', 'Cassava'],
        optionsSw: ['Mahindi', 'Basil au marigold', 'Mchele', 'Muhogo'],
        correctIndex: 1,
      },
      {
        question: 'When should you scout your field for pests?',
        questionSw: 'Lini unapaswa kukagua shamba lako kwa wadudu?',
        options: ['Only when you see damage', 'Regularly, at least weekly', 'Once per season', 'Never, wait for problems'],
        optionsSw: ['Unapoona uharibifu tu', 'Mara kwa mara, angalau kila wiki', 'Mara moja kwa msimu', 'Kamwe, subiri matatizo'],
        correctIndex: 1,
      },
    ],
  },
  // IRRIGATION
  {
    articleId: 'irrigation-drip',
    articleTitle: 'irrigation|drip|water|watering',
    questions: [
      {
        question: 'What is the main advantage of drip irrigation?',
        questionSw: 'Faida kuu ya umwagiliaji wa matone ni ipi?',
        options: ['It is cheaper to install', 'It saves water and delivers directly to roots', 'It works without electricity', 'It waters faster'],
        optionsSw: ['Ni rahisi kufunga', 'Inaokoa maji na kupeleka moja kwa moja kwenye mizizi', 'Inafanya kazi bila umeme', 'Inamwagilia haraka'],
        correctIndex: 1,
      },
      {
        question: 'How much water can drip irrigation save compared to flood irrigation?',
        questionSw: 'Umwagiliaji wa matone unaweza kuokoa maji kiasi gani ikilinganishwa na umwagiliaji wa mafuriko?',
        options: ['10%', '30-50%', '50-70%', 'No difference'],
        optionsSw: ['10%', '30-50%', '50-70%', 'Hakuna tofauti'],
        correctIndex: 2,
      },
      {
        question: 'How often should you check drip irrigation lines for blockages?',
        questionSw: 'Mara ngapi unapaswa kukagua njia za umwagiliaji wa matone kwa vizuizi?',
        options: ['Once a year', 'Regularly, at least monthly', 'Only when plants die', 'Never'],
        optionsSw: ['Mara moja kwa mwaka', 'Mara kwa mara, angalau kila mwezi', 'Mimea inapokufa tu', 'Kamwe'],
        correctIndex: 1,
      },
      {
        question: 'What time of day is best for irrigation?',
        questionSw: 'Wakati gani wa siku ni bora kwa umwagiliaji?',
        options: ['Midday', 'Early morning', 'Late afternoon only', 'Midnight'],
        optionsSw: ['Mchana', 'Asubuhi mapema', 'Alasiri tu', 'Usiku wa manane'],
        correctIndex: 1,
      },
    ],
  },
  // HARVESTING
  {
    articleId: 'harvesting-storage',
    articleTitle: 'harvest|storage|post-harvest|store',
    questions: [
      {
        question: 'What moisture level should grains be dried to for safe storage?',
        questionSw: 'Kiwango gani cha unyevu kinafaa nafaka zikaushwe ili zihifadhiwe salama?',
        options: ['20-25%', '12-14%', '5%', '30%'],
        optionsSw: ['20-25%', '12-14%', '5%', '30%'],
        correctIndex: 1,
      },
      {
        question: 'What is a major cause of post-harvest losses?',
        questionSw: 'Sababu kuu ya upotevu baada ya mavuno ni ipi?',
        options: ['Too much rain', 'Poor storage and pest damage', 'Too many workers', 'Selling too fast'],
        optionsSw: ['Mvua nyingi sana', 'Uhifadhi mbaya na uharibifu wa wadudu', 'Wafanyakazi wengi sana', 'Kuuza haraka sana'],
        correctIndex: 1,
      },
      {
        question: 'How should you store harvested maize to prevent weevil damage?',
        questionSw: 'Unafaa kuhifadhi mahindi yaliyovunwa vipi ili kuzuia uharibifu wa wadudu?',
        options: ['Leave in open air', 'Use airtight containers or treat with approved pesticides', 'Mix with water', 'Store in sunlight'],
        optionsSw: ['Acha hewani', 'Tumia vyombo visivyopitisha hewa au tibu na dawa zilizoidhinishwa', 'Changanya na maji', 'Hifadhi kwenye jua'],
        correctIndex: 1,
      },
      {
        question: 'When is the best time to harvest maize?',
        questionSw: 'Wakati gani ni bora kuvuna mahindi?',
        options: ['When leaves are green', 'When cobs are dry and husks are brown', 'During rainy season', 'As soon as tassels appear'],
        optionsSw: ['Majani yakiwa mabichi', 'Vibua vikiwa vikavu na maganda ya kahawia', 'Wakati wa mvua', 'Mara moja manyoya yanapotokea'],
        correctIndex: 1,
      },
    ],
  },
  // MARKETING
  {
    articleId: 'marketing-selling',
    articleTitle: 'market|sell|price|business|profit',
    questions: [
      {
        question: 'What factor most affects the price you can get for your produce?',
        questionSw: 'Jambo gani linaloathiri zaidi bei unayoweza kupata kwa mazao yako?',
        options: ['Time of day', 'Quality and market timing', 'Distance to market', 'Buyer\'s mood'],
        optionsSw: ['Wakati wa siku', 'Ubora na wakati wa soko', 'Umbali wa soko', 'Hali ya mnunuzi'],
        correctIndex: 1,
      },
      {
        question: 'Why is it important to know market prices before selling?',
        questionSw: 'Kwa nini ni muhimu kujua bei za soko kabla ya kuuza?',
        options: ['To impress buyers', 'To negotiate fair prices and avoid being cheated', 'It is not important', 'To sell faster'],
        optionsSw: ['Kuvutia wanunuzi', 'Kujadiliana bei nzuri na kuepuka kudanganywa', 'Si muhimu', 'Kuuza haraka'],
        correctIndex: 1,
      },
      {
        question: 'What is value addition in agriculture?',
        questionSw: 'Kuongeza thamani katika kilimo ni nini?',
        options: ['Adding more fertilizer', 'Processing raw produce to increase its value', 'Growing more crops', 'Selling at night'],
        optionsSw: ['Kuongeza mbolea', 'Kusindika mazao ghafi kuongeza thamani yake', 'Kupanda mazao zaidi', 'Kuuza usiku'],
        correctIndex: 1,
      },
      {
        question: 'What is a benefit of forming a farmer group for marketing?',
        questionSw: 'Faida ya kuunda kikundi cha wakulima kwa masoko ni ipi?',
        options: ['More meetings', 'Better bargaining power and bulk sales', 'Less work', 'Free seeds'],
        optionsSw: ['Mikutano zaidi', 'Nguvu bora ya majadiliano na mauzo ya jumla', 'Kazi kidogo', 'Mbegu bure'],
        correctIndex: 1,
      },
    ],
  },
  // SOIL HEALTH
  {
    articleId: 'soil-health',
    articleTitle: 'soil|compost|fertilizer|nutrient|organic',
    questions: [
      {
        question: 'What is the benefit of adding compost to soil?',
        questionSw: 'Faida ya kuongeza mboji kwenye udongo ni ipi?',
        options: ['Makes soil harder', 'Improves soil structure and adds nutrients', 'Kills all insects', 'Prevents rain'],
        optionsSw: ['Inafanya udongo kuwa mgumu', 'Inaboresha muundo wa udongo na kuongeza virutubisho', 'Inaua wadudu wote', 'Inazuia mvua'],
        correctIndex: 1,
      },
      {
        question: 'How can you tell if your soil is healthy?',
        questionSw: 'Unawezaje kujua kama udongo wako una afya?',
        options: ['It is very dry', 'It has earthworms and dark color', 'It is completely white', 'It smells bad'],
        optionsSw: ['Ni mkavu sana', 'Una minyoo na rangi nyeusi', 'Ni mweupe kabisa', 'Unanuka vibaya'],
        correctIndex: 1,
      },
      {
        question: 'What do legumes do for soil?',
        questionSw: 'Mikunde inafanya nini kwa udongo?',
        options: ['Remove all nutrients', 'Fix nitrogen from air into soil', 'Make it more acidic', 'Nothing'],
        optionsSw: ['Kuondoa virutubisho vyote', 'Kurekebisha nitrojeni kutoka hewani kwenye udongo', 'Kuifanya kuwa tindikali zaidi', 'Hakuna'],
        correctIndex: 1,
      },
      {
        question: 'When should you apply fertilizer to maize?',
        questionSw: 'Lini unapaswa kuweka mbolea kwa mahindi?',
        options: ['Only after harvest', 'At planting and when plants reach knee height', 'Never', 'Only when leaves turn yellow'],
        optionsSw: ['Baada ya mavuno tu', 'Wakati wa kupanda na mimea ifikapo kimo cha goti', 'Kamwe', 'Majani yanapobadilika njano tu'],
        correctIndex: 1,
      },
    ],
  },
];

// Function to find quiz for an article based on title or category
export function findQuizForArticle(articleTitle: string, articleCategory?: string): ArticleQuiz | null {
  const titleLower = articleTitle.toLowerCase();
  const categoryLower = (articleCategory || '').toLowerCase();

  // Try to find a matching quiz based on title keywords
  for (const quiz of articleQuizzes) {
    const keywords = quiz.articleTitle.toLowerCase().split('|');
    for (const keyword of keywords) {
      if (titleLower.includes(keyword.trim()) || categoryLower.includes(keyword.trim())) {
        return quiz;
      }
    }
  }

  // Fallback: return a quiz based on category
  const categoryQuizMap: Record<string, string> = {
    planting: 'planting-spacing',
    pest_control: 'pest-control-natural',
    irrigation: 'irrigation-drip',
    harvesting: 'harvesting-storage',
    marketing: 'marketing-selling',
    general: 'best-practices',
  };

  const fallbackQuizId = categoryQuizMap[categoryLower] || 'best-practices';
  return articleQuizzes.find(q => q.articleId === fallbackQuizId) || null;
}
