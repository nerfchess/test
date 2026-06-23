// Localy v3 landing page — "neighborhood zine / sticker-map" redesign.
// Ported from the approved standalone HTML/CSS prototype. The page is static
// (CSS-only animations), so the styles are injected scoped to this route and
// the markup is rendered verbatim for a faithful first integration. It can be
// refactored into granular React components later without changing the design.

const LANDING_CSS = `:root{
    --paper:#FBF6EC; --ink:#1A1712; --tang:#FF5A1F; --amber:#F5A623;
    --teal:#0E8C7F; --muted:#6b6358; --soft:#3a342c; --card:#fff;
    --disp:"Arial Black","Helvetica Neue",Impact,system-ui,sans-serif;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{
    background:var(--paper);color:var(--ink);line-height:1.5;
    font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    -webkit-font-smoothing:antialiased;
    background-image:radial-gradient(rgba(26,23,18,.06) 1.4px, transparent 1.4px);
    background-size:22px 22px;
  }
  a{text-decoration:none;color:inherit}
  ul{list-style:none}
  img{display:block;max-width:100%}
  .container{max-width:1180px;margin:0 auto;padding:0 24px}
  .display{font-family:var(--disp);letter-spacing:-.02em;line-height:1.0}
  .center{text-align:center}

  /* marker highlight */
  .mark{position:relative;display:inline-block}
  .mark>span{position:relative;z-index:1}
  .mark::after{content:"";position:absolute;z-index:0;left:-6px;right:-6px;bottom:6%;height:42%;background:var(--tang);transform:rotate(-2.5deg);border-radius:3px}
  .mark-teal::after{background:var(--teal)}
  .mark-amber::after{background:var(--amber)}

  /* sticker buttons */
  .sticker{display:inline-flex;align-items:center;gap:8px;font-weight:800;border:2px solid var(--ink);
    border-radius:14px;padding:11px 20px;font-size:15px;cursor:pointer;
    box-shadow:4px 4px 0 var(--ink);transition:transform .12s ease,box-shadow .12s ease,background .2s}
  .sticker:hover{transform:translate(-1px,-1px);box-shadow:6px 6px 0 var(--ink)}
  .sticker:active{transform:translate(2px,2px);box-shadow:1px 1px 0 var(--ink)}
  .sticker.big{padding:15px 28px;font-size:17px;border-radius:16px}
  .sticker-tang{background:var(--tang);color:#fff}
  .sticker-ghost{background:var(--card);color:var(--ink)}
  .sticker-ink{background:var(--ink);color:var(--paper)}

  /* top bar */
  .topbar{position:sticky;top:0;z-index:50;background:rgba(251,246,236,.92);backdrop-filter:blur(8px);border-bottom:2px solid var(--ink)}
  .bar{display:flex;align-items:center;justify-content:space-between;padding:14px 0}
  .logo{display:flex;align-items:center;gap:8px;font-family:var(--disp);font-size:22px}
  .links{display:flex;gap:26px;font-weight:700;font-size:15px}
  .links a:hover{color:var(--tang)}
  .bar-cta{display:flex;align-items:center;gap:18px}
  .textlink{font-weight:800}
  .textlink:hover{color:var(--tang)}

  /* hero */
  .hero{display:grid;grid-template-columns:1.08fr .92fr;gap:48px;align-items:center;padding:60px 24px 44px}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;font-weight:800;font-size:14px;background:var(--card);
    border:2px solid var(--ink);border-radius:999px;padding:6px 14px;box-shadow:3px 3px 0 var(--ink)}
  .eyebrow .star{color:var(--amber)}
  h1.hero-title{font-size:clamp(44px,6vw,78px);line-height:.98;letter-spacing:-.025em;margin-top:20px}
  .lead{margin-top:22px;font-size:18px;max-width:520px;color:var(--soft)}
  .cta-row{margin-top:28px;display:flex;flex-wrap:wrap;gap:14px;align-items:center}
  .microtrust{margin-top:18px;font-weight:700;font-size:14px;color:var(--muted)}
  .microtrust b{color:var(--ink)}

  /* hero phone */
  .stage{position:relative;display:flex;justify-content:center}
  .phone{position:relative;width:300px;height:600px;background:var(--ink);border:3px solid var(--ink);
    border-radius:44px;padding:12px;box-shadow:12px 14px 0 var(--ink);transform:rotate(3deg)}
  .notch{position:absolute;top:14px;left:50%;transform:translateX(-50%);width:120px;height:22px;background:var(--ink);border-radius:0 0 16px 16px;z-index:3}
  .screen{position:relative;height:100%;border-radius:34px;overflow:hidden;background:#000}
  .feed{display:flex;flex-direction:column;gap:10px;padding:10px;animation:scrollfeed 18s linear infinite}
  @keyframes scrollfeed{from{transform:translateY(0)}to{transform:translateY(-50%)}}
  .phone:hover .feed{animation-play-state:paused}
  .vid{position:relative;flex:0 0 auto;height:262px;border-radius:18px;overflow:hidden}
  .vid img{width:100%;height:100%;object-fit:cover}
  .vid-deal{position:absolute;top:10px;left:10px;background:var(--tang);color:#fff;font-weight:800;font-size:11px;padding:3px 9px;border-radius:999px;border:2px solid #fff}
  .vid-play{position:absolute;top:10px;right:10px;width:28px;height:28px;display:grid;place-items:center;border-radius:50%;background:rgba(0,0,0,.5);color:#fff;font-size:11px}
  .vid-meta{position:absolute;left:0;right:0;bottom:0;padding:14px 12px;background:linear-gradient(transparent,rgba(0,0,0,.82));color:#fff}
  .vid-meta b{font-size:15px;display:block}
  .vid-meta span{font-size:12px;opacity:.82}
  .badge{position:absolute;background:var(--card);border:2px solid var(--ink);border-radius:12px;padding:8px 12px;font-weight:800;font-size:13px;box-shadow:4px 4px 0 var(--ink);z-index:6}
  .b1{top:54px;left:-12px;transform:rotate(-7deg)}
  .b2{top:250px;right:-22px;transform:rotate(6deg);background:var(--amber)}
  .b3{bottom:70px;left:-26px;transform:rotate(5deg);background:var(--teal);color:#fff}

  /* marquee */
  .marquee{background:var(--ink);overflow:hidden;padding:14px 0;border-top:2px solid var(--ink);border-bottom:2px solid var(--ink)}
  .marquee.tight{padding-top:0;border-top:0}
  .track{display:flex;gap:14px;width:max-content;animation:marquee 30s linear infinite}
  .track.rev{animation-direction:reverse}
  .marquee:hover .track{animation-play-state:paused}
  @keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
  .mpill{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;background:var(--paper);color:var(--ink);
    font-weight:800;border-radius:999px;padding:9px 18px;font-size:15px;border:2px solid var(--paper)}
  .mpill.t{background:var(--tang);color:#fff;border-color:var(--tang)}
  .mpill.a{background:var(--amber)}
  .mpill.g{background:var(--teal);color:#fff;border-color:var(--teal)}

  /* sections */
  .section{padding:76px 24px}
  .sec-head h2{font-size:clamp(32px,4.6vw,54px)}
  .sec-head p{margin-top:12px;font-size:17px;color:var(--muted);max-width:560px}
  .sec-head{margin-bottom:36px}

  /* bento */
  .bento{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:198px;gap:16px;grid-auto-flow:dense}
  .tile{position:relative;border:2px solid var(--ink);border-radius:20px;overflow:hidden;box-shadow:5px 5px 0 var(--ink);transition:transform .15s,box-shadow .15s}
  .tile:hover{transform:translate(-2px,-2px);box-shadow:8px 8px 0 var(--ink)}
  .tile img{width:100%;height:100%;object-fit:cover}
  .tile .ov{position:absolute;left:0;right:0;bottom:0;padding:14px;background:linear-gradient(transparent,rgba(0,0,0,.8));color:#fff}
  .tile .ov b{font-size:16px;display:block}
  .tile .ov span{font-size:12px;opacity:.85}
  .tile .deal{position:absolute;top:12px;left:12px;background:var(--tang);color:#fff;font-weight:800;font-size:12px;border:2px solid #fff;border-radius:999px;padding:4px 10px}
  .tile .play{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.92);color:var(--ink);font-size:13px}
  .t-lg{grid-column:span 2;grid-row:span 2}
  .t-wide{grid-column:span 2}
  .t-tall{grid-row:span 2}
  .center-cta{margin-top:36px;text-align:center}

  /* steps */
  .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
  .step{background:var(--card);border:2px solid var(--ink);border-radius:22px;padding:30px 26px;box-shadow:6px 6px 0 var(--ink);text-align:center}
  .num{width:62px;height:62px;margin:0 auto 16px;display:grid;place-items:center;font-family:var(--disp);font-size:26px;
    border:2px solid var(--ink);border-radius:50%;background:var(--amber);transform:rotate(-6deg)}
  .step:nth-child(2) .num{background:var(--tang);color:#fff}
  .step:nth-child(3) .num{background:var(--teal);color:#fff}
  .step h3{font-size:20px}
  .step p{margin-top:8px;color:var(--muted);font-size:15px}

  /* map */
  .mapwrap{display:grid;grid-template-columns:1fr 1fr;gap:0;align-items:stretch;background:var(--card);
    border:2px solid var(--ink);border-radius:28px;box-shadow:8px 8px 0 var(--ink);overflow:hidden}
  .map-copy{padding:44px}
  .map-copy p{margin-top:14px;color:var(--muted);font-size:16px;max-width:380px}
  .nbhd-chips{margin:22px 0 26px;display:flex;flex-wrap:wrap;gap:10px}
  .chip{background:var(--paper);border:2px solid var(--ink);border-radius:999px;padding:8px 16px;font-weight:700;font-size:14px;box-shadow:3px 3px 0 var(--ink)}
  .chip:hover{background:var(--amber)}
  .map-grid{position:relative;display:grid;grid-template-columns:repeat(6,1fr);grid-auto-rows:1fr;gap:7px;padding:18px;background:var(--teal);min-height:360px}
  .blk{background:rgba(251,246,236,.9);border-radius:7px}
  .blk.road{background:rgba(251,246,236,.35)}
  .blk.park{background:var(--amber)}
  .blk.tang{background:var(--tang)}
  .pin{position:absolute;font-size:26px;filter:drop-shadow(0 2px 0 rgba(0,0,0,.3))}
  .pin.p1{top:22%;left:28%}
  .pin.p2{top:54%;left:62%}
  .pin.p3{top:74%;left:34%}

  /* owners band */
  .owners-band{background:var(--ink);color:var(--paper);padding:66px 0;border-top:2px solid var(--ink);border-bottom:2px solid var(--ink)}
  .owners-inner{display:grid;grid-template-columns:1.35fr .65fr;gap:44px;align-items:center}
  .kicker{display:inline-block;font-weight:800;font-size:13px;letter-spacing:.1em;text-transform:uppercase;color:var(--amber)}
  .owners-band h2{font-size:clamp(30px,4vw,46px);margin-top:10px}
  .owners-band p{margin-top:16px;color:rgba(251,246,236,.78);font-size:17px;max-width:520px}
  .owner-points{margin-top:20px;display:flex;flex-wrap:wrap;gap:10px 18px;font-weight:700;font-size:15px}
  .owner-points li{background:rgba(251,246,236,.08);border:1px solid rgba(251,246,236,.25);padding:7px 14px;border-radius:999px}
  .owners-cta{display:flex;flex-direction:column;gap:12px;align-items:flex-start}
  .owners-band .sticker-tang{border-color:var(--paper);box-shadow:5px 5px 0 var(--paper)}
  .owners-band .sticker-tang:hover{box-shadow:7px 7px 0 var(--paper)}
  .owners-cta .muted{color:rgba(251,246,236,.6);font-size:14px;font-weight:700}

  /* proof */
  .stats{display:flex;flex-wrap:wrap;justify-content:center;gap:48px;margin-bottom:44px}
  .stat{text-align:center}
  .stat .n{font-family:var(--disp);font-size:46px;color:var(--tang)}
  .stat .l{font-weight:700;color:var(--muted);font-size:14px}
  .notes{display:grid;grid-template-columns:repeat(3,1fr);gap:26px}
  .note{position:relative;background:var(--card);border:2px solid var(--ink);border-radius:6px;padding:28px 22px 22px;
    box-shadow:5px 5px 0 var(--ink);font-size:16px}
  .note::before{content:"";position:absolute;top:-12px;left:50%;transform:translateX(-50%) rotate(-3deg);width:84px;height:22px;background:rgba(245,166,35,.65);border:1px dashed rgba(0,0,0,.25)}
  .note cite{display:block;margin-top:14px;font-style:normal;font-weight:800;font-size:14px}
  .note:nth-child(1){transform:rotate(-1.5deg)}
  .note:nth-child(2){transform:rotate(1.2deg)}
  .note:nth-child(3){transform:rotate(-.7deg)}

  /* footer */
  .footer{border-top:2px solid var(--ink);padding:56px 0 30px}
  .foot-inner{display:grid;grid-template-columns:1.4fr 2fr;gap:40px}
  .foot-tag{margin-top:12px;color:var(--muted);max-width:300px}
  .foot-cols{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  .foot-cols h4{font-size:13px;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px}
  .foot-cols a{display:block;padding:5px 0;color:var(--soft);font-weight:600}
  .foot-cols a:hover{color:var(--tang)}
  .foot-bottom{display:flex;align-items:center;justify-content:space-between;margin-top:42px;padding-top:24px;border-top:1px solid rgba(0,0,0,.12)}
  .socials{display:flex;gap:18px}
  .socials a:hover{color:var(--tang)}
  .copy{font-size:13px;color:var(--muted);font-weight:700}

  /* reveal */
  @keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
  .reveal{animation:fadeUp .7s both}

  a:focus-visible,button:focus-visible{outline:3px solid var(--tang);outline-offset:3px}

  @media (max-width:900px){
    .links{display:none}
    .hero{grid-template-columns:1fr;gap:36px;padding-top:40px}
    .stage{order:-1}
    .phone{transform:rotate(2deg) scale(.92)}
    .bento{grid-template-columns:repeat(2,1fr);grid-auto-rows:170px}
    .t-lg{grid-column:span 2;grid-row:span 2}
    .steps{grid-template-columns:1fr}
    .mapwrap{grid-template-columns:1fr}
    .owners-inner{grid-template-columns:1fr}
    .notes{grid-template-columns:1fr}
    .foot-inner{grid-template-columns:1fr}
  }
  @media (max-width:560px){
    .b1,.b3{display:none}
    .foot-cols{grid-template-columns:1fr 1fr}
  }
  @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}`;

const LANDING_HTML = `<header class="topbar">
    <div class="bar container">
      <a class="logo" href="#">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--tang)"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>
        <span>Localy</span>
      </a>
      <nav class="links">
        <a href="#near">Explore</a>
        <a href="#how">How it works</a>
        <a href="#owners">For businesses</a>
      </nav>
      <div class="bar-cta">
        <a class="textlink" href="#">Sign in</a>
        <a class="sticker sticker-tang" href="#">Browse local</a>
      </div>
    </div>
  </header>

  <section class="hero container reveal">
    <div class="hero-copy">
      <span class="eyebrow"><span class="star">★</span> 4.8 · 2,300+ locals exploring nearby</span>
      <h1 class="display hero-title">The small shops near you, <span class="mark"><span>on video.</span></span></h1>
      <p class="lead">Scroll real clips from the businesses around the corner — find hidden gems, today's deals, and the spots your neighbours swear by.</p>
      <div class="cta-row">
        <a class="sticker sticker-tang big" href="#">Browse local</a>
        <a class="sticker sticker-ghost big" href="#owners">List your business</a>
      </div>
      <p class="microtrust"><b>Free.</b> No download needed to browse · 25 neighbourhoods · 1,000+ businesses</p>
    </div>
    <div class="stage">
      <div class="phone">
        <div class="notch"></div>
        <div class="screen">
          <div class="feed">
            <article class="vid"><img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop" alt=""><span class="vid-deal">20% off</span><span class="vid-play">▶</span><div class="vid-meta"><b>Pho Shop</b><span>Willowdale · 0.3km</span></div></article>
            <article class="vid"><img src="https://images.unsplash.com/photo-1561181286-d3fee7d55364?q=80&w=600&auto=format&fit=crop" alt=""><span class="vid-play">▶</span><div class="vid-meta"><b>Dream Rose Florist</b><span>Richmond Hill · 0.6km</span></div></article>
            <article class="vid"><img src="https://images.unsplash.com/photo-1453614512568-c4024d13c247?q=80&w=600&auto=format&fit=crop" alt=""><span class="vid-deal">BOGO</span><span class="vid-play">▶</span><div class="vid-meta"><b>Ana Pastry</b><span>Downtown · 1.1km</span></div></article>
            <article class="vid"><img src="https://images.unsplash.com/photo-1556228578-8c89e6adf883?q=80&w=600&auto=format&fit=crop" alt=""><span class="vid-play">▶</span><div class="vid-meta"><b>Align Wellness</b><span>Midtown · 0.9km</span></div></article>
            <article class="vid"><img src="https://images.unsplash.com/photo-1521123845560-14093637aa24?q=80&w=600&auto=format&fit=crop" alt=""><span class="vid-deal">New</span><span class="vid-play">▶</span><div class="vid-meta"><b>Corner Books</b><span>Old Town · 0.4km</span></div></article>
            <article class="vid"><img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=600&auto=format&fit=crop" alt=""><span class="vid-deal">20% off</span><span class="vid-play">▶</span><div class="vid-meta"><b>Pho Shop</b><span>Willowdale · 0.3km</span></div></article>
            <article class="vid"><img src="https://images.unsplash.com/photo-1561181286-d3fee7d55364?q=80&w=600&auto=format&fit=crop" alt=""><span class="vid-play">▶</span><div class="vid-meta"><b>Dream Rose Florist</b><span>Richmond Hill · 0.6km</span></div></article>
            <article class="vid"><img src="https://images.unsplash.com/photo-1453614512568-c4024d13c247?q=80&w=600&auto=format&fit=crop" alt=""><span class="vid-deal">BOGO</span><span class="vid-play">▶</span><div class="vid-meta"><b>Ana Pastry</b><span>Downtown · 1.1km</span></div></article>
            <article class="vid"><img src="https://images.unsplash.com/photo-1556228578-8c89e6adf883?q=80&w=600&auto=format&fit=crop" alt=""><span class="vid-play">▶</span><div class="vid-meta"><b>Align Wellness</b><span>Midtown · 0.9km</span></div></article>
            <article class="vid"><img src="https://images.unsplash.com/photo-1521123845560-14093637aa24?q=80&w=600&auto=format&fit=crop" alt=""><span class="vid-deal">New</span><span class="vid-play">▶</span><div class="vid-meta"><b>Corner Books</b><span>Old Town · 0.4km</span></div></article>
          </div>
        </div>
      </div>
      <span class="badge b1">🍜 Pho Shop · 0.3km</span>
      <span class="badge b2">20% off today</span>
      <span class="badge b3">💐 New near you</span>
    </div>
  </section>

  <div class="marquee" aria-hidden="true">
    <div class="track">
      <span class="mpill t">🍜 Food &amp; Drink</span><span class="mpill">☕ Cafés</span><span class="mpill a">🛍️ Retail</span><span class="mpill">💐 Florists</span><span class="mpill g">💇 Barbers</span><span class="mpill">🧘 Wellness</span><span class="mpill a">📚 Bookshops</span><span class="mpill">🎨 Makers</span>
      <span class="mpill t">🍜 Food &amp; Drink</span><span class="mpill">☕ Cafés</span><span class="mpill a">🛍️ Retail</span><span class="mpill">💐 Florists</span><span class="mpill g">💇 Barbers</span><span class="mpill">🧘 Wellness</span><span class="mpill a">📚 Bookshops</span><span class="mpill">🎨 Makers</span>
    </div>
  </div>
  <div class="marquee tight" aria-hidden="true">
    <div class="track rev">
      <span class="mpill">🔧 Services</span><span class="mpill g">🐾 Pet shops</span><span class="mpill">🍰 Bakeries</span><span class="mpill t">💅 Beauty</span><span class="mpill">🍷 Wine &amp; spirits</span><span class="mpill a">🏋️ Fitness</span><span class="mpill">🌿 Garden</span><span class="mpill t">🎸 Music</span>
      <span class="mpill">🔧 Services</span><span class="mpill g">🐾 Pet shops</span><span class="mpill">🍰 Bakeries</span><span class="mpill t">💅 Beauty</span><span class="mpill">🍷 Wine &amp; spirits</span><span class="mpill a">🏋️ Fitness</span><span class="mpill">🌿 Garden</span><span class="mpill t">🎸 Music</span>
    </div>
  </div>

  <section id="near" class="container section reveal">
    <div class="sec-head">
      <h2 class="display">What's <span class="mark mark-teal"><span>near you</span></span></h2>
      <p>Tap a clip to watch. Tap a deal to claim. No account needed to start.</p>
    </div>
    <div class="bento">
      <article class="tile t-lg"><img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=900&auto=format&fit=crop" alt=""><span class="deal">Chef's special</span><span class="play">▶</span><div class="ov"><b>The Corner Kitchen</b><span>Willowdale · Food &amp; Drink</span></div></article>
      <article class="tile"><img src="https://images.unsplash.com/photo-1561181286-d3fee7d55364?q=80&w=600&auto=format&fit=crop" alt=""><span class="play">▶</span><div class="ov"><b>Dream Rose Florist</b><span>Richmond Hill</span></div></article>
      <article class="tile t-tall"><img src="https://images.unsplash.com/photo-1521334884684-d80222895322?q=80&w=600&auto=format&fit=crop" alt=""><span class="deal">New-customer</span><span class="play">▶</span><div class="ov"><b>Fade &amp; Co. Barbers</b><span>Downtown · Beauty</span></div></article>
      <article class="tile"><img src="https://images.unsplash.com/photo-1453614512568-c4024d13c247?q=80&w=600&auto=format&fit=crop" alt=""><span class="deal">BOGO</span><span class="play">▶</span><div class="ov"><b>Ana Pastry</b><span>Old Town</span></div></article>
      <article class="tile t-wide"><img src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=900&auto=format&fit=crop" alt=""><span class="play">▶</span><div class="ov"><b>Maple &amp; Thread</b><span>Midtown · Retail</span></div></article>
      <article class="tile"><img src="https://images.unsplash.com/photo-1556228578-8c89e6adf883?q=80&w=600&auto=format&fit=crop" alt=""><span class="play">▶</span><div class="ov"><b>Align Wellness</b><span>Midtown</span></div></article>
      <article class="tile"><img src="https://images.unsplash.com/photo-1521123845560-14093637aa24?q=80&w=600&auto=format&fit=crop" alt=""><span class="deal">20% off</span><span class="play">▶</span><div class="ov"><b>Corner Books</b><span>Old Town</span></div></article>
    </div>
    <div class="center-cta"><a class="sticker sticker-tang big" href="#">See all near you →</a></div>
  </section>

  <section id="how" class="container section reveal">
    <h2 class="display center" style="margin-bottom:36px">Three taps to <span class="mark"><span>shop local</span></span></h2>
    <div class="steps">
      <div class="step"><div class="num">1</div><h3>Browse</h3><p>Scroll short videos from the small businesses right around you — no app download required.</p></div>
      <div class="step"><div class="num">2</div><h3>Find</h3><p>Catch today's deals, hours, and the story behind each spot, all in one swipe.</p></div>
      <div class="step"><div class="num">3</div><h3>Support</h3><p>Walk in, shop, and keep your neighbourhood thriving — one local visit at a time.</p></div>
    </div>
  </section>

  <section class="container section reveal">
    <div class="mapwrap">
      <div class="map-copy">
        <h2 class="display">A living map of <span class="mark mark-teal"><span>your area</span></span></h2>
        <p>Pick a neighbourhood or let us use your location — then watch the block come to life, business by business.</p>
        <div class="nbhd-chips">
          <a class="chip" href="#">Willowdale</a>
          <a class="chip" href="#">Richmond Hill</a>
          <a class="chip" href="#">Downtown</a>
          <a class="chip" href="#">Old Town</a>
          <a class="chip" href="#">Midtown</a>
        </div>
        <a class="sticker sticker-ink big" href="#">📍 Use my location</a>
      </div>
      <div class="map-grid" aria-hidden="true">
        <div class="blk"></div><div class="blk road"></div><div class="blk"></div><div class="blk park"></div><div class="blk"></div><div class="blk"></div>
        <div class="blk road"></div><div class="blk road"></div><div class="blk road"></div><div class="blk road"></div><div class="blk road"></div><div class="blk road"></div>
        <div class="blk"></div><div class="blk"></div><div class="blk tang"></div><div class="blk"></div><div class="blk road"></div><div class="blk"></div>
        <div class="blk park"></div><div class="blk"></div><div class="blk road"></div><div class="blk"></div><div class="blk"></div><div class="blk tang"></div>
        <div class="blk"></div><div class="blk road"></div><div class="blk"></div><div class="blk"></div><div class="blk road"></div><div class="blk"></div>
        <span class="pin p1">📍</span><span class="pin p2">📍</span><span class="pin p3">📍</span>
      </div>
    </div>
  </section>

  <section id="owners" class="owners-band reveal">
    <div class="container owners-inner">
      <div>
        <span class="kicker">For business owners</span>
        <h2 class="display">Get found by the locals next door.</h2>
        <p>List free, post short videos, and run deals that bring people through your door. No commission, no catch.</p>
        <ul class="owner-points">
          <li>✓ Free listing</li>
          <li>✓ Reach nearby customers</li>
          <li>✓ Videos &amp; deals built in</li>
        </ul>
      </div>
      <div class="owners-cta">
        <a class="sticker sticker-tang big" href="#">List your business</a>
        <span class="muted">Takes about 5 minutes</span>
      </div>
    </div>
  </section>

  <section class="container section proof reveal">
    <div class="stats">
      <div class="stat"><div class="n">1,000+</div><div class="l">local businesses</div></div>
      <div class="stat"><div class="n">25</div><div class="l">neighbourhoods</div></div>
      <div class="stat"><div class="n">4.8★</div><div class="l">average rating</div></div>
    </div>
    <div class="notes">
      <blockquote class="note">“I found three new spots on my own street I never knew existed.”<cite>— Priya, Willowdale</cite></blockquote>
      <blockquote class="note">“Listed my bakery in five minutes and had walk-ins from it the same week.”<cite>— Marco, Ana Pastry</cite></blockquote>
      <blockquote class="note">“It's like TikTok, but everything is within walking distance. Obsessed.”<cite>— Dee, Old Town</cite></blockquote>
    </div>
  </section>

  <footer class="footer">
    <div class="container foot-inner">
      <div class="foot-brand">
        <a class="logo" href="#">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="var(--tang)"><path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg>
          <span>Localy</span>
        </a>
        <p class="foot-tag">Discover and support the small businesses around you — one short video at a time.</p>
      </div>
      <div class="foot-cols">
        <div><h4>Discover</h4><a href="#near">Browse local</a><a href="#">Deals near you</a><a href="#">Neighbourhoods</a><a href="#how">How it works</a></div>
        <div><h4>Business</h4><a href="#owners">List your business</a><a href="#">Pricing</a><a href="#">Success stories</a><a href="#">Help centre</a></div>
        <div><h4>Company</h4><a href="#">About</a><a href="#">Careers</a><a href="#">Privacy</a><a href="#">Contact</a></div>
      </div>
    </div>
    <div class="container foot-bottom">
      <div class="socials">
        <a href="#" aria-label="X"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2H21l-6.56 7.5L22 22h-6.4l-4.7-6.1L5.4 22H2.6l7.02-8.02L2 2h6.56l4.24 5.6L18.244 2Z"/></svg></a>
        <a href="#" aria-label="Instagram"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg></a>
        <a href="#" aria-label="YouTube"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.8-1.8C19.3 5 12 5 12 5s-7.3 0-8.8.5A2.5 2.5 0 0 0 1.4 7.3C1 8.8 1 12 1 12s0 3.2.4 4.7a2.5 2.5 0 0 0 1.8 1.8C4.7 19 12 19 12 19s7.3 0 8.8-.5a2.5 2.5 0 0 0 1.8-1.8C23 15.2 23 12 23 12ZM10 15V9l5 3-5 3Z"/></svg></a>
        <a href="#" aria-label="TikTok"><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 3c.3 2.1 1.5 3.6 3.6 3.9v2.6c-1.3 0-2.5-.4-3.6-1v6.1A5.6 5.6 0 1 1 10.4 9v2.7a2.9 2.9 0 1 0 2 2.8V3H16Z"/></svg></a>
      </div>
      <span class="copy">© 2026 Localy. All rights reserved.</span>
    </div>
  </footer>`;

export default function LandingScreen() {
  const styleProps = { __html: LANDING_CSS };
  const htmlProps = { __html: LANDING_HTML };
  return (
    <>
      <style dangerouslySetInnerHTML={styleProps} />
      <div className="localy-v3" dangerouslySetInnerHTML={htmlProps} />
    </>
  );
}
