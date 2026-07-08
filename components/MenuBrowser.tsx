"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/components/CartContext";
import { db } from "@/lib/firebase";

export type MenuCategory = {
  name: string;
  description: string;
  items: {
    name: string;
    price: string;
    priceValue: number;
    priceLabel?: string;
    imageTone: string;
    imageUrl?: string;
    isOutOfStock?: boolean;
  }[];
};

type FirestoreMenuItem = {
  id: string;
  name?: string;
  category?: string;
  price?: number | string;
  priceLabel?: string;
  imageUrl?: string;
  isAvailable?: boolean;
  isOutOfStock?: boolean;
};

const allCategory = "All";
const healthyFoodCategory = "healthy food";
const signatureMealCategory = "signature meal boxes starter";
const signatureAddOnsCategory = "healthy drinks add-ons";
const healthyComboSize = 5;
const healthyComboPrice = 160;

function CartIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M6 6h15l-1.5 8.5a2 2 0 0 1-2 1.5H9a2 2 0 0 1-2-1.6L5 3H2" />
      <circle cx="9" cy="20" r="1" />
      <circle cx="18" cy="20" r="1" />
    </svg>
  );
}

function FoodPlaceholder({
  name,
  category,
  imageTone,
  imageUrl,
}: {
  name: string;
  category: string;
  imageTone: string;
  imageUrl?: string;
}) {
  return (
    <div
      className={`relative flex aspect-[4/3] overflow-hidden bg-gradient-to-br ${imageTone}`}
      style={
        imageUrl
          ? {
              backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.05), rgba(0,0,0,0.68)), url("${imageUrl}")`,
              backgroundPosition: "center",
              backgroundSize: "cover",
            }
          : undefined
      }
    >
      {!imageUrl && (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(255,255,255,0.28),transparent_22%),radial-gradient(circle_at_78%_76%,rgba(0,0,0,0.26),transparent_34%)]" />
      )}
      <div className="absolute left-5 top-5 rounded-full bg-black/35 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-white backdrop-blur">
        {category}
      </div>
      <div className="absolute bottom-5 left-5 right-5">
        <div className="mb-3 flex gap-2">
          <span className="size-10 rounded-full bg-white/80 shadow-lg" />
          <span className="size-10 rounded-full bg-[#E9B44C]/90 shadow-lg" />
          <span className="size-10 rounded-full bg-[#F97316]/90 shadow-lg" />
        </div>
        <p className="text-2xl font-black leading-tight text-white drop-shadow">
          {name}
        </p>
      </div>
    </div>
  );
}

export default function MenuBrowser({ categories }: { categories: MenuCategory[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(allCategory);
  const [searchTerm, setSearchTerm] = useState("");
  const [adminItems, setAdminItems] = useState<FirestoreMenuItem[]>([]);
  const [healthySelections, setHealthySelections] = useState<string[]>([]);
  const [handledMenuAction, setHandledMenuAction] = useState("");
  const { addToCart, getItemQuantity, openCart, cartCount, cartTotal } = useCart();

  useEffect(() => {
    if (!db) {
      return;
    }

    const menuQuery = query(collection(db, "menuItems"), orderBy("category", "asc"));
    return onSnapshot(menuQuery, (snapshot) => {
      setAdminItems(
        snapshot.docs.map((document) => ({
          id: document.id,
          ...(document.data() as Omit<FirestoreMenuItem, "id">),
        })),
      );
    });
  }, []);

  const mergedCategories = useMemo(() => {
    if (adminItems.length === 0) {
      return categories;
    }

    const defaultCategoryDescriptions = new Map(
      categories.map((category) => [category.name, category.description]),
    );
    const defaultItemStyles = new Map(
      categories.flatMap((category) =>
        category.items.map((item) => [
          `${category.name.trim().toLowerCase()}::${item.name.trim().toLowerCase()}`,
          item.imageTone,
        ]),
      ),
    );
    const categoryMap = new Map<string, MenuCategory>();

    adminItems
      .filter((item) => item.name && item.category && Number.isFinite(Number(item.price)))
      .forEach((item) => {
        if (item.isAvailable === false) {
          return;
        }

        const priceValue = Number(item.price);
        const categoryName = item.category!;
        const category = categoryMap.get(categoryName) ?? {
          name: categoryName,
          description: defaultCategoryDescriptions.get(categoryName) ?? "Freshly added dishes from Kai Thuttu Kitchens.",
          items: [],
        };
        const styleKey = `${categoryName.trim().toLowerCase()}::${item.name!.trim().toLowerCase()}`;

        category.items = [
          ...category.items,
          {
            name: item.name!,
            price: item.priceLabel || `Rs. ${priceValue}`,
            priceValue,
            imageTone: defaultItemStyles.get(styleKey) ?? "from-[#2D1B14] via-[#F97316] to-[#E9B44C]",
            imageUrl: item.imageUrl,
            isOutOfStock: item.isOutOfStock,
          },
        ];
        categoryMap.set(categoryName, category);
      });

    return Array.from(categoryMap.values());
  }, [adminItems, categories]);

  const orderedCategories = useMemo(() => {
    const categoryWeight = (categoryName: string) => {
      const normalized = categoryName.trim().toLowerCase();

      if (normalized === signatureMealCategory) {
        return 10;
      }

      if (normalized === signatureAddOnsCategory) {
        return 11;
      }

      return 0;
    };

    return [...mergedCategories].sort((first, second) => {
      const firstWeight = categoryWeight(first.name);
      const secondWeight = categoryWeight(second.name);

      if (firstWeight !== secondWeight) {
        return firstWeight - secondWeight;
      }

      return first.name.localeCompare(second.name);
    });
  }, [mergedCategories]);

  const categoryNames = [allCategory, ...orderedCategories.map((category) => category.name)];

  const visibleCategories = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return orderedCategories
      .filter(
        (category) =>
          activeCategory === allCategory ||
          category.name === activeCategory ||
          (activeCategory.trim().toLowerCase() === signatureMealCategory &&
            category.name.trim().toLowerCase() === signatureAddOnsCategory),
      )
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          const searchable = `${category.name} ${item.name} ${item.price}`.toLowerCase();
          return searchable.includes(normalizedSearch);
        }),
      }))
      .filter((category) => category.items.length > 0);
  }, [activeCategory, orderedCategories, searchTerm]);

  const isHealthyCategory = (categoryName: string) =>
    categoryName.trim().toLowerCase() === healthyFoodCategory;

  const isSignatureMealCategory = (categoryName: string) =>
    categoryName.trim().toLowerCase() === signatureMealCategory;

  const getMonthlyPrice = (priceText: string) => {
    const match = priceText.match(/monthly\s*(?:rs\.?|₹)?\s*(\d+)/i);
    return match ? Number(match[1]) : null;
  };

  const toggleHealthySelection = (itemName: string) => {
    setHealthySelections((current) => {
      if (current.includes(itemName)) {
        return current.filter((name) => name !== itemName);
      }

      if (current.length >= healthyComboSize) {
        return current;
      }

      return [...current, itemName];
    });
  };

  const addHealthyComboToCart = () => {
    if (healthySelections.length !== healthyComboSize) {
      return;
    }

    addToCart({
      name: `Healthy Food Combo (${healthySelections.join(", ")})`,
      price: `Rs. ${healthyComboPrice}`,
      priceValue: healthyComboPrice,
      category: "Healthy Food",
    });
    setHealthySelections([]);
  };

  const addSignaturePlanToCart = ({
    item,
    categoryName,
    plan,
  }: {
    item: MenuCategory["items"][number];
    categoryName: string;
    plan: "Weekly" | "Monthly";
  }) => {
    const monthlyPrice = getMonthlyPrice(item.price);
    const priceValue = plan === "Monthly" ? monthlyPrice ?? item.priceValue : item.priceValue;

    addToCart({
      name: `${item.name} - ${plan} Plan`,
      price: `${plan} Rs. ${priceValue}`,
      priceValue,
      category: categoryName,
    });
  };

  useEffect(() => {
    const categoryParam = searchParams.get("category") ?? "";
    const addParam = searchParams.get("add") ?? "";
    const selectParam = searchParams.get("select") ?? "";
    const actionKey = `${categoryParam}::${addParam}::${selectParam}`;

    if (
      orderedCategories.length === 0 ||
      (!categoryParam && !addParam && !selectParam) ||
      handledMenuAction === actionKey
    ) {
      return;
    }

    if (categoryParam) {
      const matchedCategory = orderedCategories.find(
        (category) => category.name.toLowerCase() === categoryParam.toLowerCase(),
      );

      if (matchedCategory) {
        setActiveCategory(matchedCategory.name);
      }
    }

    const itemName = addParam || selectParam;

    if (!itemName) {
      setHandledMenuAction(actionKey);
      return;
    }

    const recentActionStorageKey = `kai-thuttu-menu-action:${actionKey}`;
    const recentActionTime = Number(window.sessionStorage.getItem(recentActionStorageKey) ?? 0);

    if (Date.now() - recentActionTime < 2000) {
      setHandledMenuAction(actionKey);
      return;
    }

    const matchedCategory = orderedCategories.find((category) =>
      category.items.some((item) => item.name.toLowerCase() === itemName.toLowerCase()),
    );
    const matchedItem = matchedCategory?.items.find(
      (item) => item.name.toLowerCase() === itemName.toLowerCase(),
    );

    if (!matchedCategory || !matchedItem || matchedItem.isOutOfStock) {
      setHandledMenuAction(actionKey);
      return;
    }

    setActiveCategory(matchedCategory.name);
    window.sessionStorage.setItem(recentActionStorageKey, String(Date.now()));

    if (isHealthyCategory(matchedCategory.name)) {
      setHealthySelections((current) =>
        current.includes(matchedItem.name) ? current : [...current, matchedItem.name].slice(0, healthyComboSize),
      );
      setHandledMenuAction(actionKey);
      router.replace(`/menu?category=${encodeURIComponent(matchedCategory.name)}`, { scroll: false });
      return;
    }

    if (addParam && !isSignatureMealCategory(matchedCategory.name)) {
      addToCart({
        name: matchedItem.name,
        price: matchedItem.price,
        priceValue: matchedItem.priceValue,
        category: matchedCategory.name,
      });
      setHandledMenuAction(actionKey);
      router.replace(`/menu?category=${encodeURIComponent(matchedCategory.name)}`, { scroll: false });
    }
  }, [addToCart, handledMenuAction, orderedCategories, router, searchParams]);

  return (
    <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-10">
      <div className="sticky top-20 z-30 -mx-5 border-y border-white/10 bg-[#111111]/95 px-5 py-4 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <label className="relative block w-full xl:max-w-md">
            <span className="sr-only">Search menu items</span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search biriyani, kabab, mudde..."
              className="h-12 w-full rounded-full border border-[#E9B44C]/25 bg-black/45 px-5 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-500 focus:border-[#E9B44C] focus:ring-4 focus:ring-[#E9B44C]/10"
            />
          </label>

          <div className="flex gap-2 overflow-x-auto pb-1 xl:justify-end">
            {categoryNames.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`h-11 shrink-0 rounded-full px-4 text-sm font-black transition duration-300 ${
                  activeCategory === category
                    ? "bg-[#E9B44C] text-black shadow-[0_12px_30px_rgba(233,180,76,0.22)]"
                    : "border border-white/10 bg-white/[0.06] text-zinc-200 hover:-translate-y-0.5 hover:border-[#F97316]/70 hover:text-[#E9B44C]"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={openCart}
            className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-[#F97316] px-6 text-sm font-black text-white transition duration-300 hover:-translate-y-1 hover:bg-[#E9B44C] hover:text-black"
          >
            Cart: {cartCount} items | Rs. {cartTotal}
          </button>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-14">
        {visibleCategories.length > 0 ? (
          visibleCategories.map((category) => {
            const isHealthyFood = isHealthyCategory(category.name);
            const isSignatureMeal = isSignatureMealCategory(category.name);

            return (
            <div key={category.name} id={category.name.toLowerCase().replaceAll(" ", "-")}>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
                    Category
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                    {category.name}
                  </h2>
                </div>
                <p className="max-w-xl leading-7 text-zinc-300">
                  {category.description}
                </p>
              </div>

              {isHealthyFood && (
                <div className="mb-6 rounded-lg border border-[#E9B44C]/25 bg-[#E9B44C]/10 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.22em] text-[#E9B44C]">
                        Healthy food combo
                      </p>
                      <p className="mt-2 text-lg font-black text-white">
                        Pick any {healthyComboSize} items for Rs. {healthyComboPrice}
                      </p>
                      <p className="mt-1 text-sm text-zinc-300">
                        Selected {healthySelections.length}/{healthyComboSize}. Healthy food items are not sold separately.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={healthySelections.length !== healthyComboSize}
                      onClick={addHealthyComboToCart}
                      className={`h-12 rounded-full px-6 text-sm font-black transition ${
                        healthySelections.length === healthyComboSize
                          ? "bg-[#F97316] text-white hover:bg-[#E9B44C] hover:text-black"
                          : "cursor-not-allowed bg-white/10 text-zinc-500"
                      }`}
                    >
                      Add combo for Rs. {healthyComboPrice}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {category.items.map((item) => {
                  const quantity = getItemQuantity(item.name);
                  const isOutOfStock = item.isOutOfStock === true;
                  const isHealthySelected = healthySelections.includes(item.name);
                  const isHealthySelectionDisabled =
                    isHealthyFood &&
                    !isHealthySelected &&
                    healthySelections.length >= healthyComboSize;

                  return (
                    <article
                      key={item.name}
                      className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] shadow-[0_24px_70px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-1 hover:border-[#F97316]/70 hover:bg-white/[0.09]"
                    >
                      <FoodPlaceholder
                        name={item.name}
                        category={category.name}
                        imageTone={item.imageTone}
                        imageUrl={item.imageUrl}
                      />
                      <div className="flex min-h-44 flex-col p-5">
                        <h3 className="text-xl font-black leading-snug text-amber-50">
                          {item.name}
                        </h3>
                        <p className="mt-2 text-lg font-black text-[#E9B44C]">
                          {isHealthyFood ? `Pick any ${healthyComboSize} @ Rs. ${healthyComboPrice}` : item.price}
                        </p>
                        {isOutOfStock && (
                          <p className="mt-3 w-fit rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-200">
                            Out of stock
                          </p>
                        )}
                        {isSignatureMeal && !isOutOfStock ? (
                          <div className="mt-auto grid gap-2">
                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">
                              Choose plan
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() =>
                                  addSignaturePlanToCart({
                                    item,
                                    categoryName: category.name,
                                    plan: "Weekly",
                                  })
                                }
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#F97316] px-4 text-sm font-black text-white transition duration-300 hover:-translate-y-0.5 hover:bg-[#E9B44C] hover:text-black"
                              >
                                Weekly
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  addSignaturePlanToCart({
                                    item,
                                    categoryName: category.name,
                                    plan: "Monthly",
                                  })
                                }
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#E9B44C]/40 px-4 text-sm font-black text-[#E9B44C] transition duration-300 hover:-translate-y-0.5 hover:bg-[#E9B44C] hover:text-black"
                              >
                                Monthly
                              </button>
                            </div>
                          </div>
                        ) : (
                        <button
                          type="button"
                          disabled={isOutOfStock || isHealthySelectionDisabled}
                          onClick={() => {
                            if (isHealthyFood) {
                              toggleHealthySelection(item.name);
                              return;
                            }

                            addToCart({
                              name: item.name,
                              price: item.price,
                              priceValue: item.priceValue,
                              category: category.name,
                            });
                          }}
                          className={`mt-auto inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-black transition duration-300 ${
                            isOutOfStock || isHealthySelectionDisabled
                              ? "cursor-not-allowed bg-white/10 text-zinc-500"
                              : isHealthySelected
                              ? "bg-[#E9B44C] text-black hover:-translate-y-0.5"
                              : "bg-[#F97316] text-white hover:-translate-y-0.5 hover:bg-[#E9B44C] hover:text-black"
                          }`}
                        >
                          <CartIcon />
                          {isOutOfStock
                            ? "Not Available"
                            : isHealthyFood
                            ? isHealthySelected
                              ? "Selected"
                              : isHealthySelectionDisabled
                              ? "Pick limit reached"
                              : "Select item"
                            : quantity > 0
                            ? `Added (${quantity})`
                            : "Add to Cart"}
                        </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
            );
          })
        ) : (
          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-10 text-center">
            <p className="text-2xl font-black text-white">No menu items found.</p>
            <p className="mt-2 text-zinc-300">
              Try another search term or choose a different category.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
