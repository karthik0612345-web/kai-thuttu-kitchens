import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";

const whatsappUrl =
  "https://wa.me/917676198004?text=Hi%20Kai%20Thuttu%20Kitchens%2C%20I%20would%20like%20to%20place%20an%20order.";

const featuredMenu = [
  {
    name: "Veg Biriyani",
    targetItem: "Veg Biriyani",
    price: "Rs. 100",
    detail: "Fragrant rice layered with vegetables and Karnataka-style masala.",
    image: "/veg-biriyani.jpeg",
    imagePosition: "left center",
  },
  {
    name: "Mudde Meals Veg",
    targetItem: "1 Mudde, Rice, Palya, Sambar, Rasam, Appala",
    price: "Rs. 150",
    detail: "Ragi mudde, rice, palya, sambar, rasam, and appala.",
    image: "/veg-mudde-meals.jpeg",
    imagePosition: "right center",
  },
  {
    name: "Chicken Kabab",
    targetItem: "Chicken Kabab (4 pc)",
    price: "From Rs. 180",
    detail: "Freshly fried, spicy chicken kabab for a satisfying meal.",
    image: "/chicken-kabab.jpeg",
    imagePosition: "center 58%",
  },
  {
    name: "Mudde Meals Non Veg",
    targetItem: "1 Mudde, Nati Koli Saaru, Biriyani Rice, 4 pc Kabab, 1 Egg",
    price: "Rs. 250",
    detail: "Mudde, nati koli saaru, biriyani rice, kabab, and egg.",
    image: "/non-veg-mudde-meals.jpeg",
    imagePosition: "right center",
  },
];

const menuAddHref = (itemName: string) =>
  `/menu?add=${encodeURIComponent(itemName)}`;

const healthySelectHref = (itemName: string) =>
  `/menu?category=${encodeURIComponent("Healthy Food")}&select=${encodeURIComponent(itemName)}`;

const healthyItems = [
  "Boiled Egg",
  "Boiled Chicken",
  "Veg Salad",
  "Fruit Salad",
  "Tandoor Paneer",
  "Moong Sprouts",
  "Mix Sprouts",
  "Healthy Juice",
];

const deliverySteps = [
  {
    title: "Fresh Cooking",
    text: "Homestyle batches are prepared daily with balanced spices and fresh ingredients.",
  },
  {
    title: "Quick Ordering",
    text: "Tap WhatsApp, share your items, and get fast confirmation from the kitchen.",
  },
  {
    title: "Hot Delivery",
    text: "Meals are packed carefully so families, students, and office teams eat well.",
  },
];

const testimonials = [
  {
    quote:
      "The mudde meals taste like proper home food. Filling, fresh, and perfect for lunch.",
    name: "Sahana M.",
  },
  {
    quote:
      "Their healthy food combo is my regular office order. Simple ordering and good portions.",
    name: "Rakesh P.",
  },
  {
    quote:
      "We ordered for a small family function and the catering was neat, timely, and tasty.",
    name: "Divya K.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#111111] text-white">
      <Navbar />

      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-20 bg-[url('/kai-ruchi-hero.png')] bg-cover bg-[62%_center]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_20%,rgba(233,180,76,0.32),transparent_28%),linear-gradient(90deg,rgba(17,17,17,0.96)_0%,rgba(45,27,20,0.88)_46%,rgba(17,17,17,0.36)_100%)]" />

        <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-7xl items-center gap-8 px-4 py-10 sm:min-h-[calc(100vh-80px)] sm:px-8 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
          <div className="animate-[fadeUp_900ms_ease-out_both]">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#E9B44C]/35 bg-black/45 px-3 py-1.5 backdrop-blur sm:mb-7 sm:gap-3 sm:px-4 sm:py-2">
              <span className="relative size-8 overflow-hidden rounded-full sm:size-10">
                <Image
                  src="/kai-thuttu-logo.jpeg"
                  alt="Kai Thuttu Kitchens logo"
                  fill
                  sizes="40px"
                  className="object-cover"
                  priority
                />
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[#E9B44C] sm:text-xs sm:tracking-[0.22em]">
                Traditional Karnataka Homestyle Kitchen
              </span>
            </div>

            <h1 className="max-w-4xl text-4xl font-black leading-[0.95] tracking-normal text-white sm:text-7xl lg:text-8xl">
              Kai Thuttu Kitchens
            </h1>
            <p className="mt-4 max-w-2xl text-lg font-bold leading-snug text-[#E9B44C] sm:mt-6 sm:text-3xl">
              Healthy Traditional Food Delivered Fresh
            </p>
            <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-200 sm:mt-5 sm:text-lg sm:leading-8">
              Premium homestyle Karnataka meals for families, office employees,
              students, and health-conscious food lovers. Fresh mudde meals,
              biriyani, kabab, roti, and healthy combos made with care.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:gap-4">
              <Link
                href="/menu"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[#F97316] px-6 text-sm font-black text-white shadow-[0_18px_45px_rgba(249,115,22,0.35)] transition duration-300 hover:-translate-y-1 hover:bg-[#E9B44C] hover:text-black sm:h-14 sm:px-8 sm:text-base"
              >
                Explore Menu
              </Link>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[#E9B44C]/70 bg-black/35 px-6 text-sm font-black text-[#E9B44C] backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-[#E9B44C] hover:text-black sm:h-14 sm:px-8 sm:text-base"
              >
                Order on WhatsApp
              </a>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
            <div className="absolute -inset-4 rounded-full bg-[#F97316]/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-lg border border-[#E9B44C]/35 bg-[#2D1B14]/80 p-3 shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
              <Image
                src="/kai-thuttu-logo.jpeg"
                alt="Kai Thuttu Kitchens traditional logo"
                width={720}
                height={650}
                className="h-auto w-full rounded-md object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      <section id="featured" className="mx-auto max-w-7xl px-3 py-12 sm:px-8 sm:py-20 lg:px-10">
        <div className="mb-6 flex flex-col gap-3 sm:mb-10 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#F97316] sm:text-sm sm:tracking-[0.24em]">
              Featured Menu
            </p>
            <h2 className="mt-2 max-w-2xl text-2xl font-black leading-tight text-white sm:mt-4 sm:text-5xl">
              Karnataka comfort food with a polished delivery experience.
            </h2>
          </div>
          <Link
            href="/menu"
            className="inline-flex h-10 items-center justify-center rounded-full border border-[#E9B44C]/50 px-4 text-xs font-black text-[#E9B44C] transition duration-300 hover:-translate-y-1 hover:bg-[#E9B44C] hover:text-black sm:h-12 sm:px-6 sm:text-sm"
          >
            View Full Menu
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {featuredMenu.map((item) => (
            <Link
              key={item.name}
              href={menuAddHref(item.targetItem)}
              className="group overflow-hidden rounded-lg border border-white/10 bg-white/[0.06] transition duration-300 hover:-translate-y-1 hover:border-[#F97316]/70 hover:bg-white/[0.09]"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 50vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                  style={{ objectPosition: item.imagePosition }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              </div>
              <div className="p-3 sm:p-5">
                <h3 className="text-sm font-black text-[#E9B44C] sm:text-xl">{item.name}</h3>
                <p className="mt-1 text-xs leading-5 text-zinc-300 sm:mt-2 sm:text-base sm:leading-7">{item.detail}</p>
                <p className="mt-3 inline-flex rounded-full bg-[#E9B44C] px-3 py-1.5 text-xs font-black text-black sm:mt-4 sm:px-4 sm:py-2 sm:text-sm">
                  {item.price}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-[#2D1B14] px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#E9B44C]">
              Healthy Food
            </p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
              Pick any 5 healthy items at Rs. 160.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-200">
              Built for office lunches, fitness routines, and everyday light
              meals without giving up taste.
            </p>
            <Link
              href="/menu?category=Healthy%20Food"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-[#F97316] px-6 text-sm font-black text-white transition duration-300 hover:-translate-y-1 hover:bg-[#E9B44C] hover:text-black"
            >
              Build Healthy Combo
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {healthyItems.map((item) => (
              <Link
                key={item}
                href={healthySelectHref(item)}
                className="rounded-lg border border-[#E9B44C]/20 bg-black/35 px-5 py-4 text-base font-bold text-amber-50 transition duration-300 hover:-translate-y-1 hover:border-[#E9B44C]/70"
              >
                {item}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
        <div className="grid gap-6 md:grid-cols-3">
          {deliverySteps.map((step) => (
            <article
              key={step.title}
              className="rounded-lg border border-white/10 bg-white/[0.06] p-6"
            >
              <span className="mb-5 block h-1.5 w-14 rounded-full bg-[#F97316]" />
              <h3 className="text-2xl font-black text-[#E9B44C]">{step.title}</h3>
              <p className="mt-3 leading-7 text-zinc-300">{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-black px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
              Catering Services
            </p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
              Homestyle catering for office teams and family gatherings.
            </h2>
            <p className="mt-5 text-lg leading-8 text-zinc-300">
              Plan breakfast, lunch, healthy food, biriyani, mudde meals, and
              non-veg specials for events with simple WhatsApp coordination.
            </p>
          </div>
          <div className="rounded-lg border border-[#E9B44C]/25 bg-[#2D1B14] p-6 sm:p-8">
            <p className="text-3xl font-black text-[#E9B44C]">Catering Available</p>
            <p className="mt-4 leading-8 text-zinc-200">
              Share your date, guest count, food preference, and delivery
              location. Our team will confirm menu options and pricing.
            </p>
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-[#E9B44C] px-6 text-sm font-black text-black transition duration-300 hover:-translate-y-1 hover:bg-[#F97316] hover:text-white"
            >
              Enquire on WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
        <div className="mb-10">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
            Customer Testimonials
          </p>
          <h2 className="mt-4 text-4xl font-black text-white sm:text-5xl">
            Loved by regular customers.
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((item) => (
            <figure
              key={item.name}
              className="rounded-lg border border-white/10 bg-white/[0.06] p-6 transition duration-300 hover:border-[#E9B44C]/60"
            >
              <blockquote className="leading-8 text-zinc-200">
                {item.quote}
              </blockquote>
              <figcaption className="mt-5 font-black text-[#E9B44C]">
                {item.name}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section id="contact" className="border-t border-white/10 bg-[#080604] px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.24em] text-[#F97316]">
              Contact
            </p>
            <h2 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
              Order fresh Karnataka homestyle food today.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-300">
              WhatsApp orders, cash on delivery, UPI payment, and catering
              enquiries are available.
            </p>
          </div>

          <div className="rounded-lg border border-[#E9B44C]/25 bg-[#2D1B14]/80 p-6 sm:p-8">
            <div className="flex flex-col gap-4 text-lg font-bold text-amber-50">
              <a href="tel:+917676198004" className="hover:text-[#E9B44C]">
                Phone: +91 76761 98004
              </a>
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="hover:text-[#E9B44C]">
                WhatsApp: Order Now
              </a>
              <p>Service: Delivery, takeaway, and catering</p>
              <p>Open daily for breakfast, lunch, dinner, and healthy food orders</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
