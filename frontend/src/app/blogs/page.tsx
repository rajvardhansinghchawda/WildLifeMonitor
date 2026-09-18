'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  TreePine,
  Search,
  Menu,
  X,
  ArrowRight,
  Calendar,
  Clock,
  User,
  Share2,
  CheckCircle2,
  Bookmark,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Leaf,
  Filter,
} from 'lucide-react';

interface Article {
  id: string;
  title: string;
  excerpt: string;
  category: 'conservation' | 'wildlife' | 'technology' | 'climate' | 'success';
  categoryLabel: string;
  author: string;
  date: string;
  readTime: string;
  image: string;
  alt: string;
  content: {
    lead: string;
    sections: {
      heading: string;
      paragraphs: string[];
    }[];
    quote?: {
      text: string;
      author: string;
    };
    takeaways: string[];
  };
}

export default function BlogsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const categories = [
    { id: 'all', label: 'All Articles' },
    { id: 'conservation', label: 'Conservation' },
    { id: 'wildlife', label: 'Wildlife' },
    { id: 'technology', label: 'Technology' },
    { id: 'climate', label: 'Climate Change' },
    { id: 'success', label: 'Success Stories' },
  ];

  const articles: Article[] = [
    {
      id: 'satellite-conservation',
      title: 'How Satellite Data is Changing Wildlife Conservation',
      excerpt:
        'Discover how open satellite data is helping conservationists monitor habitats and protect endangered species.',
      category: 'conservation',
      categoryLabel: 'Conservation',
      author: 'Aarav Sharma',
      date: 'Sep 10, 2025',
      readTime: '5 min read',
      image: '/blogs/blog_elephants.jpg',
      alt: 'Two African elephants on savanna at sunrise',
      content: {
        lead:
          'From the African savannahs to the dense tropical forests of Central India, satellite remote sensing is transforming the speed and accuracy of ecological stewardship.',
        sections: [
          {
            heading: 'From Space to the Savanna',
            paragraphs: [
              'Until recently, wildlife rangers relied almost entirely on footprint tracking, physical trail cameras, and retrospective field visits to detect illegal land incursions. In vast reserves spanning thousands of square kilometers, this left dangerous blind spots.',
              'With the integration of Copernicus Sentinel-2 and Landsat multi-spectral telemetry into Wildlife Watch, ground units now receive 10-meter spatial resolution updates every five days. Changes in canopy density, localized fires, and drying waterholes are flagged autonomously before irreversible habitat fragmentation occurs.',
            ],
          },
          {
            heading: 'Precision Corridor Mapping',
            paragraphs: [
              'One of the most critical breakthroughs is the dynamic classification of wildlife migration corridors. By combining Normalized Difference Vegetation Index (NDVI) anomaly detection with historical telemetry records, conservationists can identify the subtle pathways elephants and tigers use to traverse human-dominated landscapes.',
              'Protected area managers can now work cooperatively with regional highway planners, installing wildlife underpasses and eco-sensitive buffer zones with rigorous satellite verification.',
            ],
          },
        ],
        quote: {
          text:
            'Satellite telemetry does not replace the boots on the ground — it equips our rangers with telescopic sight across an entire continent.',
          author: 'Dr. Elena Rostova, Global Wildlife Habitat Institute',
        },
        takeaways: [
          '5-day revisit cycles provide near real-time deforestation detection.',
          'Multi-spectral vegetation index anomalies expose illegal land clearing.',
          'Open satellite datasets empower local indigenous rangers with equal access to planetary intelligence.',
        ],
      },
    },
    {
      id: 'ocean-giants',
      title: 'The Hidden Lives of Ocean Giants',
      excerpt:
        'Exploring how technology is revealing new insights into the migration and habitats of marine wildlife.',
      category: 'wildlife',
      categoryLabel: 'Wildlife',
      author: 'Neha Verma',
      date: 'Sep 5, 2025',
      readTime: '6 min read',
      image: '/blogs/blog_whale.jpg',
      alt: 'Majestic Humpback Whale swimming in deep ocean waters',
      content: {
        lead:
          'Across the pelagic deep, satellite tags and passive hydrophone networks are unlocking migratory secrets that remained hidden for millennia.',
        sections: [
          {
            heading: 'Acoustic Intelligence in the Deep',
            paragraphs: [
              'Blue whales and humpbacks communicate across hundreds of nautical miles using low-frequency acoustic vocalizations. In shipping corridors, underwater vessel noise frequently drowns out these critical feeding and mating calls.',
              'By pairing autonomous oceanic gliders equipped with hydrophones with satellite uplinks, researchers can map acoustic density maps in real time, alerting commercial shipping fleets to slow down when whale pods are actively congregating.',
            ],
          },
          {
            heading: 'Climate Impacts on Pelagic Foraging',
            paragraphs: [
              'Sea surface temperature anomalies detected from space reveal shifting thermal fronts where krill and plankton concentrate. As warm currents displace these blooms toward the poles, migratory routes are extending by thousands of kilometers annually.',
              'Wildlife Watch is pioneering cross-biome telemetry models, connecting marine thermal boundary shifts with coastal habitat health indices.',
            ],
          },
        ],
        quote: {
          text:
            'To understand the health of our biosphere, we must listen to the voices echoing through the oceanic abyss.',
          author: 'Capt. Marcus Thorne, Marine Conservation Trust',
        },
        takeaways: [
          'Hydrophone gliders transmit real-time whale location alerts to commercial maritime fleets.',
          'Thermal sea surface mapping predicts shifts in krill and prey abundance.',
          'Trans-oceanic telemetry bridges open-sea sanctuaries with national maritime boundaries.',
        ],
      },
    },
    {
      id: 'forest-loss',
      title: 'Forest Loss: The Silent Crisis',
      excerpt:
        'A closer look at deforestation trends, its impact on biodiversity, and what can be done.',
      category: 'climate',
      categoryLabel: 'Climate Change',
      author: 'Dr. Kunal Mehta',
      date: 'Aug 28, 2025',
      readTime: '7 min read',
      image: '/blogs/blog_forest.jpg',
      alt: 'Aerial view of winding river flowing through dense rainforest canopy',
      content: {
        lead:
          'Forests are the lungs of our planet and the sanctuaries for over eighty percent of terrestrial biodiversity. Yet fragmentation continues at an alarming pace.',
        sections: [
          {
            heading: 'The Geometry of Degradation',
            paragraphs: [
              'Deforestation rarely happens in single massive clearings. Instead, it begins with narrow access roads, followed by small exploratory agricultural clearings that slice unbroken canopy into isolated islands.',
              'These small edge-effect intrusions dry out forest interiors, increasing vulnerability to runaway brush fires and driving apex predators closer to agricultural perimeters.',
            ],
          },
          {
            heading: 'Bi-Temporal Delta Monitoring',
            paragraphs: [
              'By comparing multi-year radar and optical baselines, Wildlife Watch can discern between natural seasonal leaf shedding and true anthropogenic canopy loss.',
              'Algorithms identify disturbance clusters smaller than half an acre, generating instant geo-referenced alert tickets for field patrol units before illegal settlements become permanent.',
            ],
          },
        ],
        quote: {
          text:
            'When we sever a forest corridor, we do not simply fell trees — we unravel the web of life that binds the continent.',
          author: 'Dr. Kunal Mehta, Lead Ecologist at Conservation Frontier',
        },
        takeaways: [
          'Edge effect degradation dries forest interiors long before full clear-cutting occurs.',
          'Synthetic Aperture Radar (SAR) cuts through monsoon cloud cover to detect tree felling year-round.',
          'Early intervention within 48 hours halts 85% of unauthorized illegal logging attempts.',
        ],
      },
    },
    {
      id: 'ai-bioacoustic-monitoring',
      title: 'AI Bioacoustics: Listening to the Silent Jungle',
      excerpt:
        'Solar-powered canopy acoustic sensors trained on deep neural networks detect gunshots and chainsaws in milliseconds.',
      category: 'technology',
      categoryLabel: 'Technology',
      author: 'Aarav Sharma',
      date: 'Aug 14, 2025',
      readTime: '4 min read',
      image: '/misty-pines.jpg',
      alt: 'Misty pine mountain canopy at dawn',
      content: {
        lead:
          'Deep inside the Amazon and Western Ghats, small solar-powered microphone arrays perched high in the emergent tree layer are turning sound into instant tactical alerts.',
        sections: [
          {
            heading: 'Neural Edge Computing in the Canopy',
            paragraphs: [
              'Each bioacoustic sensor runs quantized edge neural networks trained on millions of audio spectrograms. When a chainsaw revs or a firearm discharges, the device triangulates the acoustic origin and dispatches coordinates over satellite LoRaWAN to ranger stations.',
            ],
          },
        ],
        takeaways: [
          'Sub-second gunshot and chainsaw classification using on-device ML.',
          'Solar harvesting powers autonomous listening posts for up to 5 years.',
        ],
      },
    },
    {
      id: 'tiger-recovery-story',
      title: 'Back from the Brink: The Central Indian Tiger Resurgence',
      excerpt:
        'How integrated habitat protection and community-led buffer management doubled big cat populations over a decade.',
      category: 'success',
      categoryLabel: 'Success Stories',
      author: 'Neha Verma',
      date: 'Aug 02, 2025',
      readTime: '5 min read',
      image: '/Homepage-bg1.png',
      alt: 'Royal Bengal tiger in lush forest habitat',
      content: {
        lead:
          'A decade ago, human-wildlife conflict threatened to fragment India’s core tiger corridors. Today, cooperative telemetry and community compensation funds have paved the way for historic recovery.',
        sections: [
          {
            heading: 'Co-Existence Through Telemetry',
            paragraphs: [
              'By providing village committees with transparent early-warning heatmaps of predator movements, livestock losses dropped by 74%, transforming local communities into the tigers’ fiercest defenders.',
            ],
          },
        ],
        takeaways: [
          'Village early-warning networks reduced retaliatory poisoning to near zero.',
          'Corridor connectivity between Kanha and Pench restored historic genetic flows.',
        ],
      },
    },
  ];

  // Filter articles based on active category and search query
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      const matchesCategory =
        selectedCategory === 'all' || article.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        query === '' ||
        article.title.toLowerCase().includes(query) ||
        article.excerpt.toLowerCase().includes(query) ||
        article.author.toLowerCase().includes(query) ||
        article.categoryLabel.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [articles, selectedCategory, searchQuery]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim() && newsletterEmail.includes('@')) {
      setSubscribed(true);
      setTimeout(() => {
        setNewsletterEmail('');
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-slate-800 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* ========================================================================= */}
      {/* 1. HEADER / NAVBAR                                                        */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 h-20 bg-[#16231c]/95 backdrop-blur-md border-b border-emerald-900/40 px-6 lg:px-12 flex items-center justify-between transition-all text-white">
        {/* Brand Logo & Tagline */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="relative w-11 h-11 rounded-full bg-black/50 border border-amber-400/50 flex items-center justify-center p-1.5 shadow-md group-hover:scale-105 transition-transform overflow-hidden">
            <Image
              src="/primary logo 1.png"
              alt="Wildlife Watch Logo"
              width={36}
              height={36}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-white leading-tight">
              Wildlife Watch
            </span>
            <span className="text-[11px] text-emerald-300/80 font-medium tracking-wider">
              Monitor • Protect • Conserve
            </span>
          </div>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { id: 'home', label: 'Home', href: '/' },
            { id: 'about', label: 'About', href: '/about' },
            { id: 'features', label: 'Features', href: '/features' },
            { id: 'impact', label: 'Impact', href: '/#impact' },
            { id: 'blogs', label: 'Blogs', href: '/blogs' },
            { id: 'contact', label: 'Contact', href: '/#contact' },
          ].map((item) => {
            const isActive = item.id === 'blogs';
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`relative py-1 text-sm font-medium transition-colors ${
                  isActive ? 'text-white font-bold' : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-[#48e596] rounded-full shadow-sm shadow-emerald-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden sm:flex items-center gap-4">
          <button
            onClick={() => setSearchModalOpen(true)}
            aria-label="Search"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-slate-200 hover:text-white transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>

          <Link
            href="/login"
            className="px-5 py-2 rounded-full bg-white/95 hover:bg-white border border-white/20 text-xs sm:text-sm font-semibold text-slate-900 transition-all shadow-sm"
          >
            Login
          </Link>

          <Link
            href="/explore"
            className="px-5 py-2 rounded-full bg-[#0d472a] hover:bg-[#093620] border border-emerald-500/40 text-white text-xs sm:text-sm font-bold tracking-tight shadow-md transition-all hover:scale-105 active:scale-95"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex sm:hidden items-center gap-2">
          <button
            onClick={() => setSearchModalOpen(true)}
            className="p-2 text-slate-300 hover:text-white"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-300 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="fixed top-20 inset-x-0 z-40 bg-[#16231c]/98 border-b border-emerald-900/60 p-6 space-y-4 shadow-2xl md:hidden text-white">
          <div className="flex flex-col gap-3">
            {[
              { label: 'Home', href: '/' },
              { label: 'About', href: '/about' },
              { label: 'Features', href: '/features' },
              { label: 'Impact', href: '/#impact' },
              { label: 'Blogs', href: '/blogs' },
              { label: 'Contact', href: '/#contact' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="py-2 text-sm font-semibold text-slate-200 hover:text-[#48e596]"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="pt-4 border-t border-emerald-900/40 flex gap-3">
            <Link
              href="/login"
              className="flex-1 py-2 rounded-full text-center bg-white text-slate-900 text-sm font-semibold"
            >
              Login
            </Link>
            <Link
              href="/explore"
              className="flex-1 py-2 rounded-full text-center bg-[#0d472a] text-white text-sm font-bold"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CINEMATIC HERO SECTION WITH MOUNTAIN VALLEY & BACKPACKER               */}
      {/* ========================================================================= */}
      <section className="relative w-full min-h-[460px] sm:min-h-[520px] lg:min-h-[560px] flex items-center justify-between overflow-hidden">
        {/* Background Image: High-res golden hour valley vista with seated backpacker */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/blogs/hero_composite_clean.jpg"
            alt="Mountain river valley at sunrise with hiker seated on cliff looking out"
            fill
            priority
            className="object-cover object-right lg:object-center"
            quality={95}
          />
          {/* Subtle dark gradient overlay on the left to guarantee 100% text contrast */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#111c16]/95 via-[#111c16]/75 to-transparent lg:w-3/5" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f7f8f5] to-transparent" />
        </div>

        {/* Hero Content Grid */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 w-full py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Pill, Title, Subtitle, and Live Search Bar */}
          <div className="lg:col-span-8 space-y-5 max-w-2xl text-left">
            {/* Small uppercase tag */}
            <div className="inline-block text-[#4ade80] text-xs sm:text-sm font-extrabold uppercase tracking-[0.2em] select-none">
              Our Blogs
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05] text-white drop-shadow-md">
              Stories for<br />
              a Wilder Tomorrow
            </h1>

            {/* Subtitle */}
            <p className="text-slate-200/90 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
              Insights, stories and updates from the world of wildlife, conservation and technology.
            </p>

            {/* Elevated Live Search Bar */}
            <div className="pt-3 max-w-lg">
              <div className="relative flex items-center bg-white rounded-full shadow-2xl border border-slate-200/80 px-4 py-3 sm:py-3.5 focus-within:ring-2 focus-within:ring-emerald-500 transition-all">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search articles, topics or species..."
                  className="w-full bg-transparent border-none text-slate-900 text-sm focus:outline-none placeholder:text-slate-400 pl-2 pr-10"
                />
                <button
                  type="button"
                  aria-label="Search"
                  className="absolute right-4 text-slate-500 hover:text-emerald-700 transition-colors"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Natural Scenery Area (Backpacker sitting on cliff) */}
          <div className="hidden lg:flex lg:col-span-4 justify-end items-end h-full">
            {/* The hiker and "Ideas today. A healthier tomorrow." is rendered organically inside the landscape */}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FLOATING CATEGORY TABS BAR                                             */}
      {/* ========================================================================= */}
      <section className="relative z-20 -mt-8 sm:-mt-10 max-w-7xl mx-auto px-6 lg:px-12 w-full">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-3 pt-1 scrollbar-none no-scrollbar">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 px-5 sm:px-6 py-2.5 sm:py-3 rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-md duration-200 select-none ${
                  isActive
                    ? 'bg-[#5ce5a3] text-slate-950 scale-105 shadow-emerald-400/25 ring-2 ring-emerald-400/40'
                    : 'bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 border border-slate-200/80'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FEATURED ARTICLES GRID                                                 */}
      {/* ========================================================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-10 w-full">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-3">
            <p className="text-lg font-bold text-slate-800">No matching articles found</p>
            <p className="text-sm text-slate-500">
              Try searching with another keyword or selecting &quot;All Articles&quot;.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="mt-2 px-5 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredArticles.map((article) => (
              <article
                key={article.id}
                onClick={() => setActiveArticle(article)}
                className="bg-white rounded-3xl overflow-hidden shadow-lg shadow-slate-200/60 border border-slate-100/90 hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between cursor-pointer group"
              >
                {/* Image Thumbnail with Tag */}
                <div>
                  <div className="relative h-48 sm:h-52 w-full overflow-hidden">
                    <Image
                      src={article.image}
                      alt={article.alt}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Dark gradient for badge contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-70" />

                    {/* Category Pill Tag on Image */}
                    <div className="absolute bottom-3.5 left-4">
                      <span className="inline-block px-3 py-1 rounded-xl bg-[#86efac] text-[#064e3b] text-xs font-extrabold shadow-sm">
                        {article.categoryLabel}
                      </span>
                    </div>
                  </div>

                  {/* Article Card Body */}
                  <div className="p-6 sm:p-7 space-y-3">
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-950 tracking-tight leading-snug group-hover:text-emerald-700 transition-colors">
                      {article.title}
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                      {article.excerpt}
                    </p>
                  </div>
                </div>

                {/* Article Card Footer: Author, Date, Read Time, and Arrow */}
                <div className="px-6 sm:px-7 pb-6 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    <span className="font-semibold text-slate-700">By {article.author}</span>
                    <span>•</span>
                    <span>{article.date}</span>
                    <span>•</span>
                    <span>{article.readTime}</span>
                  </div>

                  <span className="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-emerald-50 text-slate-700 group-hover:text-emerald-700 flex items-center justify-center flex-shrink-0 transition-colors">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Bottom Right "View All Articles" Link */}
        <div className="flex justify-end pt-6">
          <button
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="inline-flex items-center gap-2 text-sm font-extrabold text-slate-900 hover:text-emerald-700 transition-colors group"
          >
            <span>View All Articles</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. BOTTOM TWO-COLUMN: WENDELL BERRY QUOTE & NEWSLETTER CARDS              */}
      {/* ========================================================================= */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 py-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Wendell Berry Quote Card */}
          <div className="lg:col-span-7 bg-[#eef4ed] border border-[#d6e5d5] rounded-3xl p-6 sm:p-8 flex items-center justify-between relative overflow-hidden shadow-sm">
            <div className="flex items-center gap-5 z-10 max-w-lg">
              {/* Leaf Badge Icon */}
              <div className="w-12 h-12 rounded-full bg-[#d2e7d1] flex items-center justify-center text-[#0d472a] flex-shrink-0 shadow-inner">
                <Leaf className="w-6 h-6 fill-[#0d472a]" />
              </div>

              {/* Quote & Author */}
              <div className="space-y-1">
                <blockquote className="text-base sm:text-lg font-serif italic text-slate-900 font-semibold leading-snug">
                  &ldquo;The Earth is what we all have in common.&rdquo;
                </blockquote>
                <p className="text-xs text-slate-600 font-medium tracking-wide">
                  — Wendell Berry
                </p>
              </div>
            </div>

            {/* Decorative Leafy Branch Illustration on the Right */}
            <div className="hidden sm:block absolute right-4 -bottom-4 w-32 h-32 select-none pointer-events-none opacity-90">
              <Image
                src="/blogs/leafy_branch.png"
                alt="Green olive leaf branch illustration"
                fill
                className="object-contain"
              />
            </div>
          </div>

          {/* Right Column: Stay Updated Newsletter Card */}
          <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col justify-center space-y-3">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-950 tracking-tight">
              Stay Updated
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Get the latest stories in your inbox.
            </p>

            {subscribed ? (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Thank you! You are now subscribed to wildlife alerts.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex items-center gap-2 pt-1">
                <input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#0d472a] hover:bg-[#08331e] text-white text-xs sm:text-sm font-bold transition-all shadow-md hover:scale-105 active:scale-95 flex-shrink-0"
                >
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. LIGHT FOOTER                                                           */}
      {/* ========================================================================= */}
      <footer className="border-t border-slate-200 bg-[#f7f8f5] px-6 lg:px-12 py-8 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-[#0d472a] flex items-center justify-center text-emerald-300">
            <TreePine className="w-4 h-4" />
          </div>
          <span>Wildlife Watch • Conservation Journalism & Telemetry Updates</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-slate-600">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            Home
          </Link>
          <span>•</span>
          <Link href="/about" className="hover:text-slate-900 transition-colors">
            About
          </Link>
          <span>•</span>
          <Link href="/features" className="hover:text-slate-900 transition-colors">
            Features
          </Link>
          <span>•</span>
          <Link href="/explore" className="hover:text-slate-900 transition-colors">
            Interactive GIS
          </Link>
          <span>•</span>
          <Link href="/login" className="hover:text-slate-900 transition-colors">
            Ranger Portal
          </Link>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 7. INTERACTIVE ARTICLE READER MODAL                                       */}
      {/* ========================================================================= */}
      {activeArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Hero of the Modal */}
            <div className="relative h-56 sm:h-64 w-full flex-shrink-0">
              <Image
                src={activeArticle.image}
                alt={activeArticle.alt}
                fill
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />

              {/* Close Button */}
              <button
                onClick={() => setActiveArticle(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition-colors shadow-lg"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title & Badge over Hero */}
              <div className="absolute bottom-4 left-6 right-6 space-y-1.5 text-white">
                <span className="inline-block px-3 py-1 rounded-xl bg-[#86efac] text-[#064e3b] text-xs font-extrabold shadow-sm">
                  {activeArticle.categoryLabel}
                </span>
                <h2 className="text-xl sm:text-2xl font-black leading-tight drop-shadow-md">
                  {activeArticle.title}
                </h2>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
              {/* Meta bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100 text-xs text-slate-500 font-medium">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800">{activeArticle.author}</span>
                  <span>•</span>
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>{activeArticle.date}</span>
                  <span>•</span>
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span>{activeArticle.readTime}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 text-[11px] font-bold">
                    ODbL Verified Story
                  </span>
                </div>
              </div>

              {/* Lead Paragraph */}
              <p className="text-base sm:text-lg font-semibold text-slate-900 leading-snug">
                {activeArticle.content.lead}
              </p>

              {/* Dynamic Content Sections */}
              {activeArticle.content.sections.map((sec, idx) => (
                <div key={idx} className="space-y-2">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {sec.heading}
                  </h3>
                  {sec.paragraphs.map((p, pIdx) => (
                    <p key={pIdx} className="text-slate-600 text-sm sm:text-base">
                      {p}
                    </p>
                  ))}
                </div>
              ))}

              {/* Pull Quote */}
              {activeArticle.content.quote && (
                <div className="p-5 rounded-2xl bg-[#f0fdf4] border-l-4 border-emerald-600 space-y-1">
                  <blockquote className="font-serif italic text-slate-900 text-base sm:text-lg">
                    &ldquo;{activeArticle.content.quote.text}&rdquo;
                  </blockquote>
                  <p className="text-xs text-emerald-800 font-bold">
                    — {activeArticle.content.quote.author}
                  </p>
                </div>
              )}

              {/* Key Takeaways */}
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Key Takeaways
                </h4>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-600">
                  {activeArticle.content.takeaways.map((point, ptIdx) => (
                    <li key={ptIdx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#0d472a] hover:bg-[#07301c] text-white text-xs sm:text-sm font-bold shadow-md transition-all"
                >
                  <span>Explore on Interactive Map</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <button
                  onClick={() => setActiveArticle(null)}
                  className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-medium transition-colors"
                >
                  Close Article
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. SEARCH QUICK MODAL                                                     */}
      {/* ========================================================================= */}
      {searchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-slate-950/70 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3">
              <Search className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles, topics or species..."
                autoFocus
                className="w-full bg-transparent border-none text-slate-900 text-sm focus:outline-none placeholder:text-slate-400"
              />
              <button
                onClick={() => setSearchModalOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 text-xs text-slate-500 space-y-2">
              <div className="font-semibold text-slate-700">Quick Topics:</div>
              <div className="flex flex-wrap gap-2">
                {['Satellite Monitoring', 'Elephant Corridors', 'Ocean Giants', 'Deforestation'].map(
                  (topic) => (
                    <button
                      key={topic}
                      onClick={() => {
                        setSearchQuery(topic);
                        setSearchModalOpen(false);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium"
                    >
                      {topic}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
