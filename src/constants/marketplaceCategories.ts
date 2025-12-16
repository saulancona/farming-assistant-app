// Comprehensive African Agricultural Product Categories
// Designed for pan-African B2B marketplace

export interface ProductSubcategory {
  id: string;
  name: string;
  icon?: string;
  commonVarieties?: string[];
  typicalUnits: string[];
}

export interface ProductCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  subcategories: ProductSubcategory[];
}

export const PRODUCT_CATEGORIES: ProductCategory[] = [
  {
    id: 'grains',
    name: 'Grains & Cereals',
    icon: '🌾',
    description: 'Staple grains and cereals',
    subcategories: [
      {
        id: 'maize',
        name: 'Maize (Corn)',
        commonVarieties: ['White Maize', 'Yellow Maize', 'Hybrid 614', 'Hybrid 516', 'DK 8031', 'SC Duma'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'wheat',
        name: 'Wheat',
        commonVarieties: ['Kenya Fahari', 'Njoro BW1', 'Kwale', 'Eagle 10'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'rice',
        name: 'Rice',
        commonVarieties: ['Pishori', 'Basmati', 'Sindano', 'ITA 310', 'NERICA'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'sorghum',
        name: 'Sorghum',
        commonVarieties: ['Gadam', 'Serena', 'Seredo', 'KARI Mtama'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'millet',
        name: 'Millet',
        commonVarieties: ['Pearl Millet', 'Finger Millet (Wimbi)', 'Foxtail Millet'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'barley',
        name: 'Barley',
        commonVarieties: ['Sabini', 'HKBL 1512'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'oats',
        name: 'Oats',
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'teff',
        name: 'Teff',
        commonVarieties: ['White Teff', 'Red Teff', 'Mixed Teff'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      }
    ]
  },
  {
    id: 'legumes',
    name: 'Legumes & Pulses',
    icon: '🫘',
    description: 'Beans, peas, and lentils',
    subcategories: [
      {
        id: 'beans',
        name: 'Beans',
        commonVarieties: ['Red Kidney', 'White Beans', 'Pinto', 'Black Beans', 'Rosecoco', 'Mwitemania', 'Canadian Wonder'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'cowpeas',
        name: 'Cowpeas (Black-eyed Peas)',
        commonVarieties: ['K80', 'KVU 27-1', 'M66'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'pigeon_peas',
        name: 'Pigeon Peas',
        commonVarieties: ['ICEAP 00040', 'Mbaazi'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'green_grams',
        name: 'Green Grams (Mung Beans)',
        commonVarieties: ['N26', 'KS20'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'lentils',
        name: 'Lentils',
        commonVarieties: ['Red Lentils', 'Green Lentils', 'Brown Lentils'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'chickpeas',
        name: 'Chickpeas',
        commonVarieties: ['Desi', 'Kabuli'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'soybeans',
        name: 'Soybeans',
        commonVarieties: ['SB19', 'Gazelle', 'Nyala'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'groundnuts',
        name: 'Groundnuts (Peanuts)',
        commonVarieties: ['Valencia', 'Red Beauty', 'Homabay', 'ICGV-SM 99568'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      }
    ]
  },
  {
    id: 'vegetables',
    name: 'Vegetables',
    icon: '🥬',
    description: 'Fresh vegetables and greens',
    subcategories: [
      {
        id: 'tomatoes',
        name: 'Tomatoes',
        commonVarieties: ['Roma', 'Cherry', 'Beef', 'Oxheart', 'Cal J', 'Rio Grande', 'Money Maker'],
        typicalUnits: ['kg', 'crates', 'boxes']
      },
      {
        id: 'onions',
        name: 'Onions',
        commonVarieties: ['Red Creole', 'White Sweet Spanish', 'Bombay Red', 'Texas Grano'],
        typicalUnits: ['kg', 'bags', 'crates']
      },
      {
        id: 'potatoes',
        name: 'Potatoes',
        commonVarieties: ['Shangi', 'Dutch Robijn', 'Kenya Karibu', 'Tigoni', 'Asante'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'cabbage',
        name: 'Cabbage',
        commonVarieties: ['Copenhagen Market', 'Gloria', 'Green Coronet'],
        typicalUnits: ['pieces', 'kg', 'crates']
      },
      {
        id: 'kale',
        name: 'Kale (Sukuma Wiki)',
        commonVarieties: ['Marrow Stem', 'Thousand Headed', 'Collard Greens'],
        typicalUnits: ['bunches', 'kg']
      },
      {
        id: 'spinach',
        name: 'Spinach',
        commonVarieties: ['Ford Hook Giant', 'Viroflay'],
        typicalUnits: ['bunches', 'kg']
      },
      {
        id: 'peppers',
        name: 'Peppers',
        commonVarieties: ['Bell Pepper', 'Cayenne', 'Habanero', 'Scotch Bonnet', 'Pili Pili'],
        typicalUnits: ['kg', 'crates']
      },
      {
        id: 'carrots',
        name: 'Carrots',
        commonVarieties: ['Nantes', 'Chantenay', 'Nairobi'],
        typicalUnits: ['kg', 'bags', 'bunches']
      },
      {
        id: 'cucumbers',
        name: 'Cucumbers',
        commonVarieties: ['Ashley', 'Marketmore'],
        typicalUnits: ['kg', 'pieces', 'crates']
      },
      {
        id: 'eggplant',
        name: 'Eggplant (Aubergine)',
        commonVarieties: ['Black Beauty', 'Long Purple', 'African Garden Egg'],
        typicalUnits: ['kg', 'crates']
      },
      {
        id: 'okra',
        name: 'Okra',
        commonVarieties: ['Clemson Spineless', 'Pusa Sawani'],
        typicalUnits: ['kg', 'crates']
      },
      {
        id: 'pumpkin',
        name: 'Pumpkin & Squash',
        commonVarieties: ['Butternut', 'Crown Prince', 'Sweet Grey'],
        typicalUnits: ['kg', 'pieces']
      },
      {
        id: 'african_greens',
        name: 'African Indigenous Greens',
        commonVarieties: ['Amaranth (Terere)', 'African Nightshade (Managu)', 'Spider Plant (Saget)', 'Cowpea Leaves', 'Jute Mallow (Mrenda)'],
        typicalUnits: ['bunches', 'kg']
      },
      {
        id: 'garlic',
        name: 'Garlic',
        typicalUnits: ['kg', 'pieces']
      },
      {
        id: 'ginger',
        name: 'Ginger',
        typicalUnits: ['kg']
      }
    ]
  },
  {
    id: 'fruits',
    name: 'Fruits',
    icon: '🍎',
    description: 'Fresh fruits and tropical produce',
    subcategories: [
      {
        id: 'bananas',
        name: 'Bananas',
        commonVarieties: ['Cavendish', 'Williams', 'Apple Banana', 'Cooking Banana (Matoke)', 'Sweet Banana'],
        typicalUnits: ['bunches', 'kg', 'pieces']
      },
      {
        id: 'mangoes',
        name: 'Mangoes',
        commonVarieties: ['Apple Mango', 'Kent', 'Tommy Atkins', 'Ngowe', 'Boribo', 'Van Dyke'],
        typicalUnits: ['kg', 'crates', 'pieces']
      },
      {
        id: 'avocados',
        name: 'Avocados',
        commonVarieties: ['Hass', 'Fuerte', 'Puebla', 'Jumbo'],
        typicalUnits: ['kg', 'crates', 'pieces']
      },
      {
        id: 'pineapples',
        name: 'Pineapples',
        commonVarieties: ['Smooth Cayenne', 'MD2 Gold', 'Queen Victoria'],
        typicalUnits: ['pieces', 'kg', 'crates']
      },
      {
        id: 'oranges',
        name: 'Oranges',
        commonVarieties: ['Washington Navel', 'Valencia', 'Pixie'],
        typicalUnits: ['kg', 'crates', 'pieces']
      },
      {
        id: 'lemons_limes',
        name: 'Lemons & Limes',
        commonVarieties: ['Eureka Lemon', 'Meyer Lemon', 'Persian Lime'],
        typicalUnits: ['kg', 'crates', 'pieces']
      },
      {
        id: 'passion_fruit',
        name: 'Passion Fruit',
        commonVarieties: ['Purple Passion', 'Yellow Passion', 'Banana Passion'],
        typicalUnits: ['kg', 'crates']
      },
      {
        id: 'papaya',
        name: 'Papaya (Pawpaw)',
        commonVarieties: ['Solo', 'Sunrise', 'Mountain Papaya'],
        typicalUnits: ['kg', 'pieces', 'crates']
      },
      {
        id: 'watermelon',
        name: 'Watermelon',
        commonVarieties: ['Sugar Baby', 'Crimson Sweet', 'Charleston Grey'],
        typicalUnits: ['kg', 'pieces']
      },
      {
        id: 'grapes',
        name: 'Grapes',
        commonVarieties: ['Thompson Seedless', 'Flame Seedless', 'Red Globe'],
        typicalUnits: ['kg', 'crates']
      },
      {
        id: 'apples',
        name: 'Apples',
        commonVarieties: ['Anna', 'Golden Dorsett', 'Granny Smith'],
        typicalUnits: ['kg', 'crates', 'pieces']
      },
      {
        id: 'strawberries',
        name: 'Strawberries',
        typicalUnits: ['kg', 'punnets']
      },
      {
        id: 'guava',
        name: 'Guava',
        commonVarieties: ['White Guava', 'Pink Guava', 'Strawberry Guava'],
        typicalUnits: ['kg', 'crates']
      },
      {
        id: 'coconuts',
        name: 'Coconuts',
        commonVarieties: ['Green Coconut', 'Mature Coconut'],
        typicalUnits: ['pieces', 'kg']
      },
      {
        id: 'tree_nuts',
        name: 'Tree Nuts',
        commonVarieties: ['Macadamia', 'Cashew', 'Almonds'],
        typicalUnits: ['kg', 'bags']
      }
    ]
  },
  {
    id: 'roots_tubers',
    name: 'Roots & Tubers',
    icon: '🥔',
    description: 'Root vegetables and tubers',
    subcategories: [
      {
        id: 'cassava',
        name: 'Cassava',
        commonVarieties: ['Sweet Cassava', 'Bitter Cassava', 'MM96', 'Adhiambo Lera'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'sweet_potatoes',
        name: 'Sweet Potatoes',
        commonVarieties: ['Orange Fleshed (Vita)', 'White Fleshed', 'Purple', 'SPK004'],
        typicalUnits: ['kg', 'bags']
      },
      {
        id: 'yams',
        name: 'Yams',
        commonVarieties: ['White Yam', 'Yellow Yam', 'Water Yam'],
        typicalUnits: ['kg', 'pieces', 'bags']
      },
      {
        id: 'arrow_roots',
        name: 'Arrow Roots (Nduma)',
        typicalUnits: ['kg', 'bags']
      },
      {
        id: 'irish_potatoes',
        name: 'Irish Potatoes',
        commonVarieties: ['Shangi', 'Dutch Robijn', 'Kenya Karibu'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'cocoyam',
        name: 'Cocoyam (Taro)',
        typicalUnits: ['kg', 'bags']
      }
    ]
  },
  {
    id: 'cash_crops',
    name: 'Cash Crops',
    icon: '☕',
    description: 'Export and commercial crops',
    subcategories: [
      {
        id: 'coffee',
        name: 'Coffee',
        commonVarieties: ['Arabica', 'Robusta', 'SL28', 'SL34', 'Ruiru 11', 'Batian'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'tea',
        name: 'Tea',
        commonVarieties: ['Black Tea', 'Green Tea', 'White Tea', 'Purple Tea'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'cotton',
        name: 'Cotton',
        commonVarieties: ['Hart 89-M', 'KSA 81-M', 'SATU'],
        typicalUnits: ['kg', 'bales', 'tonnes']
      },
      {
        id: 'cocoa',
        name: 'Cocoa',
        commonVarieties: ['Forastero', 'Criollo', 'Trinitario'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'tobacco',
        name: 'Tobacco',
        commonVarieties: ['Virginia', 'Burley', 'Oriental'],
        typicalUnits: ['kg', 'bales', 'tonnes']
      },
      {
        id: 'sugarcane',
        name: 'Sugarcane',
        commonVarieties: ['CO 421', 'N14', 'KEN 82-216'],
        typicalUnits: ['tonnes', 'bundles']
      },
      {
        id: 'sisal',
        name: 'Sisal',
        typicalUnits: ['kg', 'tonnes']
      },
      {
        id: 'pyrethrum',
        name: 'Pyrethrum',
        typicalUnits: ['kg']
      }
    ]
  },
  {
    id: 'herbs_spices',
    name: 'Herbs & Spices',
    icon: '🌿',
    description: 'Culinary herbs and spices',
    subcategories: [
      {
        id: 'chillies',
        name: 'Chillies',
        commonVarieties: ['Bird Eye', 'Pili Pili', 'Habanero', 'Scotch Bonnet', 'Cayenne'],
        typicalUnits: ['kg']
      },
      {
        id: 'vanilla',
        name: 'Vanilla',
        typicalUnits: ['kg', 'pieces']
      },
      {
        id: 'cinnamon',
        name: 'Cinnamon',
        typicalUnits: ['kg']
      },
      {
        id: 'turmeric',
        name: 'Turmeric',
        typicalUnits: ['kg']
      },
      {
        id: 'cardamom',
        name: 'Cardamom',
        typicalUnits: ['kg']
      },
      {
        id: 'cloves',
        name: 'Cloves',
        typicalUnits: ['kg']
      },
      {
        id: 'black_pepper',
        name: 'Black Pepper',
        typicalUnits: ['kg']
      },
      {
        id: 'coriander',
        name: 'Coriander (Dhania)',
        typicalUnits: ['bunches', 'kg']
      },
      {
        id: 'basil',
        name: 'Basil',
        typicalUnits: ['bunches', 'kg']
      },
      {
        id: 'mint',
        name: 'Mint',
        typicalUnits: ['bunches', 'kg']
      },
      {
        id: 'rosemary',
        name: 'Rosemary',
        typicalUnits: ['bunches', 'kg']
      },
      {
        id: 'thyme',
        name: 'Thyme',
        typicalUnits: ['bunches', 'kg']
      }
    ]
  },
  {
    id: 'oilseeds',
    name: 'Oilseeds',
    icon: '🌻',
    description: 'Seeds for oil extraction',
    subcategories: [
      {
        id: 'sunflower',
        name: 'Sunflower Seeds',
        commonVarieties: ['PAN 7351', 'Kenya Fedha'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'sesame',
        name: 'Sesame Seeds',
        commonVarieties: ['White Sesame', 'Black Sesame', 'Brown Sesame'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'palm_oil',
        name: 'Palm Nuts/Oil',
        typicalUnits: ['kg', 'litres', 'tonnes']
      },
      {
        id: 'castor',
        name: 'Castor Seeds',
        typicalUnits: ['kg', 'bags']
      },
      {
        id: 'rapeseed',
        name: 'Rapeseed/Canola',
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'niger_seed',
        name: 'Niger Seed',
        typicalUnits: ['kg', 'bags']
      }
    ]
  },
  {
    id: 'livestock',
    name: 'Livestock',
    icon: '🐄',
    description: 'Live animals for sale',
    subcategories: [
      {
        id: 'cattle',
        name: 'Cattle',
        commonVarieties: ['Boran', 'Sahiwal', 'Friesian', 'Ayrshire', 'Jersey', 'Zebu'],
        typicalUnits: ['pieces']
      },
      {
        id: 'goats',
        name: 'Goats',
        commonVarieties: ['Galla', 'Toggenburg', 'Alpine', 'Small East African'],
        typicalUnits: ['pieces']
      },
      {
        id: 'sheep',
        name: 'Sheep',
        commonVarieties: ['Dorper', 'Red Maasai', 'Corriedale', 'Merino'],
        typicalUnits: ['pieces']
      },
      {
        id: 'poultry',
        name: 'Poultry',
        commonVarieties: ['Broilers', 'Layers', 'Kienyeji (Indigenous)', 'Kuroiler', 'Rainbow Rooster', 'Turkeys', 'Ducks'],
        typicalUnits: ['pieces', 'kg']
      },
      {
        id: 'pigs',
        name: 'Pigs',
        commonVarieties: ['Large White', 'Landrace', 'Hampshire', 'Duroc'],
        typicalUnits: ['pieces', 'kg']
      },
      {
        id: 'rabbits',
        name: 'Rabbits',
        commonVarieties: ['New Zealand White', 'Californian', 'Kenya White'],
        typicalUnits: ['pieces']
      },
      {
        id: 'camels',
        name: 'Camels',
        typicalUnits: ['pieces']
      },
      {
        id: 'donkeys',
        name: 'Donkeys',
        typicalUnits: ['pieces']
      }
    ]
  },
  {
    id: 'animal_products',
    name: 'Animal Products',
    icon: '🥛',
    description: 'Dairy, eggs, honey, and animal products',
    subcategories: [
      {
        id: 'milk',
        name: 'Fresh Milk',
        commonVarieties: ['Cow Milk', 'Goat Milk', 'Camel Milk'],
        typicalUnits: ['litres', 'kg']
      },
      {
        id: 'eggs',
        name: 'Eggs',
        commonVarieties: ['Chicken Eggs', 'Duck Eggs', 'Quail Eggs'],
        typicalUnits: ['pieces', 'trays', 'crates']
      },
      {
        id: 'honey',
        name: 'Honey',
        commonVarieties: ['Raw Honey', 'Processed Honey', 'Comb Honey'],
        typicalUnits: ['kg', 'litres']
      },
      {
        id: 'meat',
        name: 'Fresh Meat',
        commonVarieties: ['Beef', 'Goat Meat', 'Mutton', 'Pork', 'Chicken', 'Rabbit'],
        typicalUnits: ['kg']
      },
      {
        id: 'fish',
        name: 'Fish & Seafood',
        commonVarieties: ['Tilapia', 'Nile Perch', 'Catfish', 'Trout', 'Omena', 'Prawns'],
        typicalUnits: ['kg', 'pieces']
      },
      {
        id: 'hides_skins',
        name: 'Hides & Skins',
        commonVarieties: ['Cattle Hides', 'Goat Skins', 'Sheep Skins'],
        typicalUnits: ['pieces', 'kg']
      }
    ]
  },
  {
    id: 'processed',
    name: 'Processed Products',
    icon: '🏭',
    description: 'Processed and value-added products',
    subcategories: [
      {
        id: 'flour',
        name: 'Flour & Meal',
        commonVarieties: ['Maize Flour', 'Wheat Flour', 'Cassava Flour', 'Millet Flour', 'Sorghum Flour'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'oils',
        name: 'Cooking Oils',
        commonVarieties: ['Sunflower Oil', 'Palm Oil', 'Groundnut Oil', 'Coconut Oil', 'Sesame Oil'],
        typicalUnits: ['litres', 'kg']
      },
      {
        id: 'dried_goods',
        name: 'Dried Goods',
        commonVarieties: ['Dried Fish', 'Dried Meat (Nyama Choma)', 'Dried Vegetables', 'Dried Fruits'],
        typicalUnits: ['kg', 'bags']
      },
      {
        id: 'animal_feeds',
        name: 'Animal Feeds',
        commonVarieties: ['Poultry Feed', 'Cattle Feed', 'Dairy Meal', 'Pig Feed', 'Fish Feed'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'dairy_products',
        name: 'Dairy Products',
        commonVarieties: ['Yogurt', 'Cheese', 'Butter', 'Ghee'],
        typicalUnits: ['kg', 'litres']
      },
      {
        id: 'beverages',
        name: 'Beverages',
        commonVarieties: ['Fruit Juice', 'Coffee (Ground)', 'Tea (Packaged)'],
        typicalUnits: ['litres', 'kg']
      }
    ]
  },
  {
    id: 'inputs',
    name: 'Farm Inputs',
    icon: '🌱',
    description: 'Seeds, fertilizers, and farming supplies',
    subcategories: [
      {
        id: 'seeds',
        name: 'Seeds',
        commonVarieties: ['Certified Seeds', 'Hybrid Seeds', 'Open Pollinated', 'Seedlings'],
        typicalUnits: ['kg', 'packets', 'bags']
      },
      {
        id: 'fertilizers',
        name: 'Fertilizers',
        commonVarieties: ['DAP', 'NPK', 'CAN', 'Urea', 'Organic Fertilizer', 'Manure'],
        typicalUnits: ['kg', 'bags', 'tonnes']
      },
      {
        id: 'pesticides',
        name: 'Pesticides & Herbicides',
        commonVarieties: ['Insecticides', 'Fungicides', 'Herbicides', 'Bio-pesticides'],
        typicalUnits: ['litres', 'kg']
      },
      {
        id: 'equipment',
        name: 'Farm Equipment',
        commonVarieties: ['Hand Tools', 'Sprayers', 'Irrigation Equipment', 'Storage', 'Packaging'],
        typicalUnits: ['pieces']
      }
    ]
  }
];

// Helper functions
export function getCategoryById(categoryId: string): ProductCategory | undefined {
  return PRODUCT_CATEGORIES.find(cat => cat.id === categoryId);
}

export function getSubcategoryById(categoryId: string, subcategoryId: string): ProductSubcategory | undefined {
  const category = getCategoryById(categoryId);
  return category?.subcategories.find(sub => sub.id === subcategoryId);
}

export function getAllSubcategories(): { categoryId: string; categoryName: string; subcategory: ProductSubcategory }[] {
  const result: { categoryId: string; categoryName: string; subcategory: ProductSubcategory }[] = [];

  for (const category of PRODUCT_CATEGORIES) {
    for (const subcategory of category.subcategories) {
      result.push({
        categoryId: category.id,
        categoryName: category.name,
        subcategory
      });
    }
  }

  return result;
}

export function searchProducts(query: string): { categoryId: string; categoryName: string; subcategory: ProductSubcategory }[] {
  const lowerQuery = query.toLowerCase();
  const results: { categoryId: string; categoryName: string; subcategory: ProductSubcategory }[] = [];

  for (const category of PRODUCT_CATEGORIES) {
    for (const subcategory of category.subcategories) {
      const matchesName = subcategory.name.toLowerCase().includes(lowerQuery);
      const matchesVariety = subcategory.commonVarieties?.some(v => v.toLowerCase().includes(lowerQuery));

      if (matchesName || matchesVariety) {
        results.push({
          categoryId: category.id,
          categoryName: category.name,
          subcategory
        });
      }
    }
  }

  return results;
}

// Standard units with display names
export const UNITS = {
  kg: { name: 'Kilograms', abbr: 'kg' },
  bags: { name: 'Bags (90kg)', abbr: 'bags' },
  tonnes: { name: 'Metric Tonnes', abbr: 'tonnes' },
  crates: { name: 'Crates', abbr: 'crates' },
  boxes: { name: 'Boxes', abbr: 'boxes' },
  bunches: { name: 'Bunches', abbr: 'bunches' },
  pieces: { name: 'Pieces/Units', abbr: 'pcs' },
  litres: { name: 'Litres', abbr: 'L' },
  trays: { name: 'Trays', abbr: 'trays' },
  punnets: { name: 'Punnets', abbr: 'punnets' },
  bales: { name: 'Bales', abbr: 'bales' },
  bundles: { name: 'Bundles', abbr: 'bundles' },
  packets: { name: 'Packets', abbr: 'pkts' }
};

export type UnitType = keyof typeof UNITS;

// Quality grades with descriptions
export const QUALITY_GRADES = {
  premium: {
    name: 'Premium',
    description: 'Export quality, top grade',
    color: 'purple'
  },
  grade_a: {
    name: 'Grade A',
    description: 'Excellent quality, first class',
    color: 'green'
  },
  grade_b: {
    name: 'Grade B',
    description: 'Good quality, minor defects',
    color: 'blue'
  },
  standard: {
    name: 'Standard',
    description: 'Market standard quality',
    color: 'gray'
  }
};

export type QualityGrade = keyof typeof QUALITY_GRADES;
