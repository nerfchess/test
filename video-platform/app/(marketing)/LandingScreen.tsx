"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Upload,
  Play,
  X,
  Twitter,
  Music2,
  Youtube,
  Facebook,
  Instagram,
  MapPin,
} from "lucide-react";

const slides = [
  {
    image: "/landing/hero-food.png",
    title: ["DISCOVER LOCAL.", "SUPPORT LOCAL."],
    artist: "Pho Shop",
    role: "5051 Yonge St Unit #2",
  },
  {
    image: "/landing/hero-restaurant.png",
    title: ["DISCOVER LOCAL.", "SUPPORT LOCAL."],
    artist: "Andy's Pho",
    role: "5051 Yonge St Unit #2",
  },
  {
    image: "/landing/hero-flowers.png",
    title: ["DISCOVER LOCAL.", "SUPPORT LOCAL."],
    artist: "Dream Rose Florist",
    role: "14 Levendale Rd, Richmond Hill",
  },
];

const trending = [
  { img: "/landing/biz-ana-pastry.png", title: "Ana Pastry", artist: "26 Church St S" },
  { img: "/landing/biz-aneals.png", title: "Aneal's Taste of the Islands", artist: "10220 Yonge St" },
  { img: "/landing/biz-advanced-printing.png", title: "Advanced Printing", artist: "10330 Yonge St" },
  { img: "/landing/biz-align.png", title: "Align Health & Wellness", artist: "22 Richmond St" },
  { img: "/landing/biz-acuvega.png", title: "Acuvega Wellness Center", artist: "207-22 Richmond St" },
  { img: "/landing/biz-arnold.png", title: "Arnold Crescent Animal Hospital", artist: "26 Arnold Cres" },
];

export default function LandingScreen() {
  const [banner, setBanner] = useState(true);
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, []);

  const current = slides[slide];

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      {/* Promo banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border bg-secondary"
          >
            <div className="relative flex items-center justify-center gap-2 px-4 py-2.5 text-sm">
              <span className="text-accent">&#9670;</span>
              <span className="font-semibold">Now available:</span>
              <span className="text-muted-foreground">Trusted By over 1000+ business&nbsp;</span>
              <a href="#" className="font-semibold underline-offset-4 hover:underline">
                Learn More
              </a>
              <button
                onClick={() => setBanner(false)}
                aria-label="Dismiss"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0 text-muted-foreground hover:-translate-y-1/2 hover:scale-100 hover:text-foreground active:-translate-y-1/2 active:scale-100"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <section className="px-3 pt-3">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-card">
          <AnimatePresence mode="sync">
            <motion.div
              key={slide}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
              className="absolute inset-0"
            >
              <Image
                src={current.image}
                alt=""
                fill
                priority={slide === 0}
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-black/30" />
            </motion.div>
          </AnimatePresence>

          {/* Nav */}
          <div className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
            <Link href="/" className="flex items-center gap-2 text-primary">
              <MapPin className="h-7 w-7 fill-primary" strokeWidth={1.5} />
              <span className="font-display text-xl tracking-wide">Localy</span>
            </Link>
            <nav className="flex items-center gap-2 text-sm font-medium">
              <Link
                href="/login"
                className="rounded-full bg-primary px-5 py-2 text-primary-foreground transition hover:bg-primary/90"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-black px-5 py-2 text-primary ring-1 ring-white/20 transition hover:bg-white/10"
              >
                Create account
              </Link>
              <Link href="/onboarding" className="hidden px-3 text-primary/80 hover:text-primary sm:inline">
                For Small Buisnesses
              </Link>
            </nav>
          </div>

          {/* Hero content */}
          <div className="relative z-10 grid min-h-[520px] grid-rows-[1fr_auto] px-6 pb-10 sm:min-h-[600px] sm:px-12 sm:pb-14">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.7, delay: 0.4 }}
                className="max-w-2xl pt-8"
              >
                <h1 className="font-display text-5xl uppercase leading-[0.95] tracking-tight text-primary sm:text-7xl">
                  {current.title[0]}
                  <br />
                  {current.title[1]}
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-relaxed text-primary/85 sm:text-base">
                  Discover your community&apos;s largest collection of local businesses: popular spots you already know,
                  plus hidden gems, family-owned shops, exclusive deals, and services you won&apos;t find on major
                  platforms.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/upload"
                    className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:scale-[1.02]"
                  >
                    Upload
                  </Link>
                  <Link
                    href="/feed"
                    className="rounded-full bg-transparent px-6 py-2.5 text-sm font-semibold text-primary ring-1 ring-white/40 transition hover:bg-white/10"
                  >
                    Explore Go+
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="relative flex items-end justify-center">
              <div className="flex items-center gap-2">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={`h-2 rounded-full p-0 transition-all hover:scale-100 active:scale-100 ${i === slide ? "w-6 bg-primary" : "w-2 bg-primary/40"}`}
                  />
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={slide}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: 0.5 }}
                  className="absolute right-0 bottom-0 text-right text-primary"
                >
                  <div className="font-display text-lg tracking-wide">{current.artist}</div>
                  <div className="text-xs text-primary/70">{current.role}</div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* Search */}
      <section className="mt-16 bg-black px-6 py-14 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="relative">
            <Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-white/50" size={18} />
            <input
              type="search"
              placeholder="Search for businesses, restaurants, services, deals"
              className="h-14 w-full rounded-full bg-white/10 pl-12 pr-5 text-base text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
          <div className="mt-6 text-sm font-semibold text-white">or</div>
          <Link
            href="/upload"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:scale-[1.02]"
          >
            <Upload size={16} /> Upload your own
          </Link>
        </div>
      </section>

      {/* Trending - sliding right-to-left */}
      <section className="mt-20 overflow-hidden">
        <h2 className="mb-8 text-center font-display text-2xl tracking-wide">See What&apos;s In Your Area</h2>
        <div className="group relative">
          <motion.div
            className="flex w-max gap-5 px-6"
            animate={{ x: ["0%", "-50%"] }}
            transition={{ duration: 45, ease: "linear", repeat: Infinity }}
          >
            {[...trending, ...trending].map((t, i) => (
              <div key={`${t.title}-${i}`} className="w-44 shrink-0 sm:w-52">
                <div className="group/card relative aspect-square overflow-hidden rounded-md bg-muted">
                  <Image
                    src={t.img}
                    alt={t.title}
                    fill
                    sizes="(min-width: 640px) 13rem, 11rem"
                    className="object-cover transition duration-500 group-hover/card:scale-105"
                  />
                  <button className="absolute bottom-3 right-3 grid h-10 w-10 place-items-center rounded-full bg-accent p-0 text-accent-foreground opacity-0 shadow-lg transition group-hover/card:opacity-100">
                    <Play size={16} className="ml-0.5 fill-current" />
                  </button>
                </div>
                <div className="mt-3 truncate text-sm font-semibold">{t.title}</div>
                <div className="truncate text-xs text-muted-foreground">{t.artist}</div>
              </div>
            ))}
          </motion.div>
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/feed"
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:scale-[1.02]"
          >
            Explore small buisnesses
          </Link>
        </div>
      </section>

      {/* Never Stop Listening */}
      <section className="mx-auto mt-32 grid max-w-6xl gap-10 px-6 md:grid-cols-2 md:items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="font-display text-5xl uppercase leading-[0.95] tracking-tight sm:text-6xl">
            NEVER STOP
            <br />
            DISCOVERING
          </h2>
          <div className="mt-8 flex items-center gap-5">
            <div className="relative grid h-28 w-28 place-items-center rounded-md bg-white p-1.5">
              <Image src="/landing/qr-code.png" alt="Scan QR code" width={1011} height={1024} className="h-full w-full object-contain" />
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">
              Scan to grab the app. Unlimited discounts, new places, your choice &mdash; wherever you go.
            </p>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, rotate: -6 }}
          whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="flex justify-center"
        >
          <Image
            src="/landing/listening-phone-v3.png"
            alt="Restaurant interior"
            width={543}
            height={433}
            loading="lazy"
            className="w-full max-w-md rounded-lg"
          />
        </motion.div>
      </section>

      {/* Calling All Creators */}
      <section className="mx-auto mt-28 grid max-w-6xl gap-10 px-6 md:grid-cols-2 md:items-center">
        <motion.div
          initial={{ opacity: 0, x: -60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden rounded-md"
        >
          <Image
            src="/landing/creator-dining.jpg"
            alt="Friends dining at a local restaurant"
            width={1920}
            height={1280}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="font-display text-5xl uppercase leading-[0.95] tracking-tight sm:text-6xl">
            CALLING ALL
            <br />
            SMALL BUISNESSES
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-muted-foreground">
            Discover hidden local businesses, connect directly with owners, and support the communities around you.
            Explore authentic products, services, and experiences&mdash;all in one place.
          </p>
          <Link
            href="/onboarding"
            className="mt-7 inline-flex rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:scale-[1.02]"
          >
            Find out more
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="mx-auto mt-28 max-w-6xl px-6 pb-12">
        <div className="flex flex-wrap justify-center gap-7 text-muted-foreground">
          {[Twitter, Music2, Music2, Youtube, Facebook, Instagram].map((Icon, i) => (
            <a key={i} href="#" className="transition hover:text-foreground">
              <Icon size={18} />
            </a>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} LOCALY. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
