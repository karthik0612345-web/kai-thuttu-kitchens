import type { MenuCategory } from "@/components/MenuBrowser";

export const defaultMenuCategories: MenuCategory[] = [
  {
    name: "Veg",
    description: "Vegetarian biriyani and kabab favorites made fresh.",
    items: [
      { name: "Veg Biriyani", price: "Rs. 100", priceValue: 100, imageTone: "from-emerald-700 via-lime-600 to-[#E9B44C]" },
      { name: "Mushroom Kabab", price: "Rs. 120", priceValue: 120, imageTone: "from-stone-700 via-orange-700 to-[#F97316]" },
      { name: "Mushroom Biriyani", price: "Rs. 130", priceValue: 130, imageTone: "from-yellow-800 via-amber-600 to-emerald-700" },
      { name: "Paneer Biriyani", price: "Rs. 150", priceValue: 150, imageTone: "from-orange-800 via-[#F97316] to-[#E9B44C]" },
      { name: "Paneer Kabab", price: "Rs. 140", priceValue: 140, imageTone: "from-red-800 via-orange-600 to-amber-500" },
    ],
  },
  {
    name: "Mudde Meals Veg",
    description: "Traditional ragi mudde veg meal with all classic sides.",
    items: [
      { name: "1 Mudde, Rice, Palya, Sambar, Rasam, Appala", price: "Rs. 150", priceValue: 150, imageTone: "from-[#2D1B14] via-green-800 to-[#E9B44C]" },
    ],
  },
  {
    name: "Mudde Meals Non Veg",
    description: "A complete non-veg mudde meal with nati koli saaru.",
    items: [
      { name: "1 Mudde, Nati Koli Saaru, Biriyani Rice, 4 pc Kabab, 1 Egg", price: "Rs. 250", priceValue: 250, imageTone: "from-red-950 via-[#F97316] to-[#2D1B14]" },
    ],
  },
  {
    name: "Rice Roti Mudde",
    description: "Simple staples to pair with curries, meals, and sides.",
    items: [
      { name: "White Rice", price: "Rs. 80", priceValue: 80, imageTone: "from-zinc-700 via-stone-500 to-white" },
      { name: "Parota", price: "Rs. 35", priceValue: 35, imageTone: "from-yellow-900 via-amber-600 to-orange-500" },
      { name: "Chapati", price: "Rs. 50", priceValue: 50, imageTone: "from-amber-900 via-yellow-700 to-[#E9B44C]" },
      { name: "Jolada Roti", price: "Rs. 50", priceValue: 50, imageTone: "from-stone-800 via-yellow-800 to-amber-500" },
      { name: "Mudde", price: "Rs. 30", priceValue: 30, imageTone: "from-[#2D1B14] via-stone-700 to-amber-700" },
    ],
  },
  {
    name: "Non Veg",
    description: "Chicken specials, kabab, biriyani, curry, and boiled eggs.",
    items: [
      { name: "Lemon Chicken", price: "Rs. 180", priceValue: 180, imageTone: "from-lime-800 via-[#F97316] to-yellow-500" },
      { name: "Chicken Curry", price: "Rs. 180", priceValue: 180, imageTone: "from-red-950 via-orange-700 to-[#E9B44C]" },
      { name: "Chicken Kabab (4 pc)", price: "Rs. 180", priceValue: 180, imageTone: "from-red-900 via-[#F97316] to-orange-400" },
      { name: "Chicken Kabab (8 pc)", price: "Rs. 220", priceValue: 220, imageTone: "from-red-950 via-orange-600 to-amber-400" },
      { name: "Chicken Pepper Dry", price: "Rs. 180", priceValue: 180, imageTone: "from-zinc-950 via-stone-700 to-[#F97316]" },
      { name: "Chicken Chops", price: "Rs. 180", priceValue: 180, imageTone: "from-red-950 via-[#2D1B14] to-orange-500" },
      { name: "Chicken Biriyani Full", price: "Rs. 150", priceValue: 150, imageTone: "from-yellow-900 via-orange-700 to-red-800" },
      { name: "Eggs Boiled (2 pc)", price: "Rs. 50", priceValue: 50, imageTone: "from-stone-800 via-white to-[#E9B44C]" },
    ],
  },
  {
    name: "Healthy Food",
    description: "Pick any five healthy items for Rs. 160.",
    items: [
      { name: "Boiled Egg", price: "Pick any 5 @ Rs. 160", priceValue: 160, imageTone: "from-zinc-800 via-white to-[#E9B44C]" },
      { name: "Boiled Chicken", price: "Pick any 5 @ Rs. 160", priceValue: 160, imageTone: "from-stone-700 via-orange-300 to-amber-200" },
      { name: "Veg Salad", price: "Pick any 5 @ Rs. 160", priceValue: 160, imageTone: "from-green-900 via-emerald-600 to-lime-400" },
      { name: "Fruit Salad", price: "Pick any 5 @ Rs. 160", priceValue: 160, imageTone: "from-red-700 via-yellow-500 to-green-500" },
      { name: "Tandoor Paneer", price: "Pick any 5 @ Rs. 160", priceValue: 160, imageTone: "from-red-800 via-orange-500 to-amber-300" },
      { name: "Moong Sprouts", price: "Pick any 5 @ Rs. 160", priceValue: 160, imageTone: "from-green-950 via-lime-700 to-[#E9B44C]" },
      { name: "Mix Sprouts", price: "Pick any 5 @ Rs. 160", priceValue: 160, imageTone: "from-emerald-950 via-green-600 to-orange-400" },
      { name: "Boiled Sweet Potato", price: "Pick any 5 @ Rs. 160", priceValue: 160, imageTone: "from-purple-950 via-orange-700 to-[#F97316]" },
      { name: "Boiled Sweet Corn", price: "Pick any 5 @ Rs. 160", priceValue: 160, imageTone: "from-green-800 via-yellow-500 to-[#E9B44C]" },
      { name: "Healthy Juice", price: "Pick any 5 @ Rs. 160", priceValue: 160, imageTone: "from-orange-800 via-yellow-500 to-green-500" },
    ],
  },
  {
    name: "Signature Meal Boxes Starter",
    description: "Healthy weekly and monthly meal box plans with balanced salad, vegetables, fruits, eggs, nuts, and protein options.",
    items: [
      {
        name: "Balance Box",
        price: "Weekly Rs. 410 | Monthly Rs. 1500",
        priceValue: 410,
        imageTone: "from-emerald-800 via-lime-600 to-[#E9B44C]",
      },
      {
        name: "Smart Fuel Box (Grand Box)",
        price: "Weekly Rs. 610 | Monthly Rs. 2399",
        priceValue: 610,
        imageTone: "from-green-900 via-yellow-600 to-orange-500",
      },
      {
        name: "Power Nourish Box (Royal Box)",
        price: "Weekly Rs. 710 | Monthly Rs. 2799",
        priceValue: 710,
        imageTone: "from-[#2D1B14] via-emerald-700 to-[#E9B44C]",
      },
      {
        name: "Chicken Power Nourish Box (Royal Box)",
        price: "Weekly Rs. 910 | Monthly Rs. 3599",
        priceValue: 910,
        imageTone: "from-red-950 via-[#F97316] to-[#E9B44C]",
      },
    ],
  },
  {
    name: "Healthy Drinks Add-ons",
    description: "Fresh juices and malt add-ons for meal boxes and healthy orders.",
    items: [
      { name: "ABC Juice", price: "Rs. 45", priceValue: 45, imageTone: "from-red-800 via-orange-500 to-green-600" },
      { name: "Amla Juice", price: "Rs. 35", priceValue: 35, imageTone: "from-green-900 via-lime-600 to-[#E9B44C]" },
      { name: "Ragi Malt", price: "Rs. 25", priceValue: 25, imageTone: "from-[#2D1B14] via-stone-700 to-[#E9B44C]" },
      { name: "Ginger Lemon Juice", price: "Rs. 30", priceValue: 30, imageTone: "from-yellow-900 via-lime-500 to-[#F97316]" },
      { name: "Bitter Gourd Juice", price: "Rs. 25", priceValue: 25, imageTone: "from-green-950 via-emerald-700 to-lime-400" },
      { name: "Beetroot Juice", price: "Rs. 25", priceValue: 25, imageTone: "from-red-950 via-pink-700 to-[#F97316]" },
      { name: "Carrot Juice", price: "Rs. 25", priceValue: 25, imageTone: "from-orange-950 via-[#F97316] to-[#E9B44C]" },
    ],
  },
];

export const defaultMenuItems = defaultMenuCategories.flatMap((category) =>
  category.items.map((item) => ({
    ...item,
    category: category.name,
  })),
);
