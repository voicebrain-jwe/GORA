<template>
  <ion-page class="gora-lp">
    <ion-content
      class="lp-content"
      data-bs-theme="light"
      :fullscreen="true"
      :scroll-events="true"
      @ion-scroll="onScroll"
    >
      <div v-if="isNativeApp" class="lp lp-welcome" data-bs-theme="dark" @pointerdown="ping">
        <picture class="lp-welcome__bg" aria-hidden="true">
          <img src="/images/gora-hoop-small.webp" alt="" />
        </picture>
        <div class="lp-welcome__shade" aria-hidden="true" />
        <div class="lp-arena lp-welcome__arena" aria-hidden="true">
          <div class="lp-arena__grid">
            <span class="lp-arena__line" />
            <span class="lp-arena__circle" />
          </div>
        </div>
        <div class="lp-shots lp-welcome__shots" aria-hidden="true">
          <svg viewBox="0 0 300 220" width="300" height="220">
            <path
              v-for="(shot, index) in welcomeShots"
              :key="`w-trail-${index}`"
              class="lp-shots__trail"
              :d="shot"
              pathLength="1"
              :style="{ animationDelay: `${index * 2.4}s` }"
            />
          </svg>
          <span
            v-for="(shot, index) in welcomeShots"
            :key="`w-ball-${index}`"
            class="lp-shots__ball"
            :style="{ offsetPath: `path('${shot}')`, animationDelay: `${index * 2.4}s` }"
          />
          <span
            v-for="index in welcomeShots.length"
            :key="`w-swish-${index}`"
            class="lp-shots__swish lp-welcome__swish"
            :style="{ animationDelay: `${(index - 1) * 2.4}s` }"
          ><span /></span>
        </div>
        <span
          v-for="item in pings"
          :key="item.id"
          class="lp-ping"
          :style="{ left: `${item.x}px`, top: `${item.y}px` }"
          aria-hidden="true"
        />
        <span class="lp-blob lp-blob--one" aria-hidden="true" />
        <span class="lp-blob lp-blob--two" aria-hidden="true" />
        <div class="lp-welcome__body">
          <div class="lp-welcome__brand lp-enter">{{ GORA_NAME }}<span class="text-primary">/</span></div>
          <h1 class="lp-display lp-welcome__title lp-enter" style="--enter-delay: 120ms">
            Find your game.<br />Find your <span class="lp-gradient-text">people.</span>
          </h1>
          <p class="lp-welcome__copy lp-enter" style="--enter-delay: 240ms">
            Pickup
            <span class="lp-welcome__sport" aria-live="off">
              <Transition name="lp-word" mode="out-in">
                <strong :key="welcomeSport.name">{{ welcomeSport.name.toLowerCase() }}</strong>
              </Transition>
            </span>
            games, clubs, and highlights from players near you.
          </p>
          <div class="lp-welcome__ticker lp-enter" style="--enter-delay: 300ms" aria-hidden="true">
            <div class="lp-welcome__track">
              <template v-for="copy in 2" :key="copy">
                <span v-for="sport in sports" :key="`${copy}-${sport.name}`" class="lp-welcome__chip">
                  <ion-icon :icon="sport.icon" /> {{ sport.name }}
                </span>
              </template>
            </div>
          </div>
          <div class="lp-welcome__actions lp-enter" style="--enter-delay: 360ms">
            <router-link to="/register" class="btn btn-primary btn-lg rounded-pill lp-btn-glow">Create account</router-link>
            <router-link to="/login" class="btn btn-outline-light btn-lg rounded-pill">Sign in</router-link>
          </div>
        </div>
      </div>

      <div v-else class="lp" data-bs-theme="dark" :class="{ 'lp--motion': motionReady }">
        <a class="lp-skip btn btn-primary" href="#main">Skip to content</a>

        <!-- ───────────── Navigation ───────────── -->
        <nav class="navbar navbar-expand-lg lp-nav" :class="{ 'lp-nav--scrolled': scrolled || navOpen }" aria-label="Main navigation">
          <div class="container">
            <router-link to="/" class="navbar-brand lp-brand" aria-label="GORA home">
              {{ GORA_NAME }}<span class="text-primary">/</span>
            </router-link>

            <router-link to="/login" class="btn btn-sm btn-primary rounded-pill px-3 ms-auto me-2 d-lg-none lp-nav-signin">
              Sign in
            </router-link>
            <button
              type="button"
              class="lp-toggler d-lg-none"
              :aria-expanded="navOpen"
              aria-controls="lp-nav-menu"
              :aria-label="navOpen ? 'Close menu' : 'Open menu'"
              @click="navOpen = !navOpen"
            >
              <ion-icon :icon="navOpen ? closeOutline : menuOutline" aria-hidden="true" />
            </button>

            <div id="lp-nav-menu" class="collapse navbar-collapse" :class="{ show: navOpen }">
              <ul class="navbar-nav mx-lg-auto gap-lg-2 py-3 py-lg-0">
                <li v-for="link in navLinks" :key="link.id" class="nav-item">
                  <button type="button" class="nav-link lp-nav-link" @click="scrollTo(link.id)">{{ link.label }}</button>
                </li>
              </ul>
              <div class="d-flex flex-column flex-lg-row gap-2 pb-3 pb-lg-0">
                <a
                  v-if="APP_DOWNLOAD_URL"
                  :href="APP_DOWNLOAD_URL"
                  class="lp-nav-download"
                  download="GORA.apk"
                  @click="onDownload"
                >
                  <span class="lp-nav-download__dot" aria-hidden="true" />
                  <ion-icon :icon="logoAndroid" aria-hidden="true" />Get the app
                </a>
                <router-link to="/login" class="btn btn-outline-light rounded-pill px-4">Sign in</router-link>
                <router-link v-magnetic to="/register" class="btn btn-primary rounded-pill px-4 lp-btn-glow">
                  Join GORA <ion-icon :icon="arrowForwardOutline" class="ms-1 align-middle" aria-hidden="true" />
                </router-link>
              </div>
            </div>
          </div>
        </nav>

        <main id="main" tabindex="-1">
          <!-- ───────────── Hero ───────────── -->
          <section class="lp-hero" aria-labelledby="hero-heading" @pointerdown="ping">
            <picture class="lp-hero__bg" aria-hidden="true">
              <source media="(max-width: 760px)" srcset="/images/gora-hoop-small.webp" />
              <img src="/images/gora-hoop.webp" width="1672" height="941" fetchpriority="high" alt="" />
            </picture>
            <div class="lp-hero__shade" aria-hidden="true" />
            <div class="lp-arena" aria-hidden="true">
              <div class="lp-arena__grid">
                <span class="lp-arena__line" />
                <span class="lp-arena__circle" />
              </div>
            </div>
            <div class="lp-shots d-none d-lg-block" aria-hidden="true">
              <svg viewBox="0 0 620 420" width="620" height="420">
                <path
                  v-for="(shot, index) in shots"
                  :key="`trail-${index}`"
                  class="lp-shots__trail"
                  :d="shot"
                  pathLength="1"
                  :style="{ animationDelay: `${index * 1.6}s` }"
                />
              </svg>
              <span
                v-for="(shot, index) in shots"
                :key="`ball-${index}`"
                class="lp-shots__ball"
                :style="{ offsetPath: `path('${shot}')`, animationDelay: `${index * 1.6}s` }"
              />
              <span
                v-for="index in shots.length"
                :key="`swish-${index}`"
                class="lp-shots__swish"
                :style="{ animationDelay: `${(index - 1) * 1.6}s` }"
              ><span /></span>
            </div>
            <span
              v-for="item in pings"
              :key="item.id"
              class="lp-ping"
              :style="{ left: `${item.x}px`, top: `${item.y}px` }"
              aria-hidden="true"
            />
            <span class="lp-blob lp-blob--one" aria-hidden="true" />
            <span class="lp-blob lp-blob--two" aria-hidden="true" />

            <div class="container position-relative">
              <div class="row align-items-center g-5 lp-hero__row">
                <div class="col-lg-8 col-xl-7">
                  <span class="badge rounded-pill lp-pill lp-enter" style="--enter-delay: 0ms">
                    <span class="lp-live-dot" aria-hidden="true" /> Less scrolling. More showing up.
                  </span>
                  <h1 id="hero-heading" class="lp-display mt-4 mb-4">
                    <span class="d-block lp-enter" style="--enter-delay: 120ms">Find your game.</span>
                    <span class="d-block lp-enter" style="--enter-delay: 240ms">
                      Find your <span class="lp-gradient-text">people.</span>
                    </span>
                  </h1>
                  <p class="lead text-body-secondary mb-4 lp-enter lp-hero__lead" style="--enter-delay: 360ms">
                    Your next pickup game. Your game-day crew. Your kind of people. Bring your love of sport —
                    we'll help you find the rest.
                  </p>
                  <div class="lp-hero__actions lp-enter" style="--enter-delay: 480ms">
                    <router-link v-magnetic to="/register" class="btn btn-primary rounded-pill px-4 lp-btn-glow">
                      Find my crew <ion-icon :icon="arrowForwardOutline" class="ms-1 align-middle" aria-hidden="true" />
                    </router-link>
                    <router-link v-magnetic to="/register?redirect=/discover" class="btn btn-outline-light rounded-pill px-4">
                      Explore games
                    </router-link>
                  </div>
                  <div class="lp-hero__get lp-enter" style="--enter-delay: 540ms">
                  <a
                    v-if="APP_DOWNLOAD_URL"
                    :href="APP_DOWNLOAD_URL"
                    class="lp-dl lp-dl--glass"
                    :class="{ 'is-started': downloadStarted }"
                    download="GORA.apk"
                    @click="onDownload"
                  >
                    <span class="lp-dl__logo" aria-hidden="true"><ion-icon :icon="logoAndroid" /></span>
                    <span class="lp-dl__text">
                      <small>Get it on Android</small>
                      <strong>{{ downloadStarted ? 'Downloading…' : 'Download the app' }}</strong>
                    </span>
                    <span class="lp-dl__action" aria-hidden="true">
                      <Transition name="lp-pop" mode="out-in">
                        <ion-icon :key="downloadStarted ? 'done' : 'go'" :icon="downloadStarted ? checkmarkOutline : downloadOutline" />
                      </Transition>
                    </span>
                  </a>
                    <span class="lp-hero__get-note">
                      <ion-icon :icon="checkmarkCircle" aria-hidden="true" /> Free · Android 7.0+ · Also works in your browser
                    </span>
                  </div>
                  <ul class="list-unstyled d-flex flex-wrap gap-2 mt-4 mb-0 lp-enter" style="--enter-delay: 600ms">
                    <li v-for="chip in heroChips" :key="chip.label">
                      <router-link :to="chip.to" class="lp-chip">
                        <ion-icon :icon="chip.icon" aria-hidden="true" /> {{ chip.label }}
                      </router-link>
                    </li>
                  </ul>
                </div>

                <div class="col-lg-4 offset-xl-1 d-none d-lg-block">
                  <div v-tilt class="lp-radar lp-enter" style="--enter-delay: 700ms">
                    <div class="lp-radar__head">
                      <span class="lp-radar__title"><span class="lp-pulse" aria-hidden="true" /> Games near you</span>
                      <span class="lp-radar__tag">Preview</span>
                    </div>
                    <div class="lp-radar__scope" aria-hidden="true">
                      <span class="lp-radar__ring" style="inset: 16%" />
                      <span class="lp-radar__ring" style="inset: 33%" />
                      <span class="lp-radar__sweep" />
                      <span
                        v-for="(blip, index) in radarBlips"
                        :key="blip.sport"
                        class="lp-radar__blip"
                        :style="{ left: `${blip.x}%`, top: `${blip.y}%`, animationDelay: `${index * 0.6}s` }"
                      >
                        <span class="lp-radar__label"><ion-icon :icon="blip.icon" /> {{ blip.sport }} · {{ blip.km }}</span>
                      </span>
                      <span class="lp-radar__you" />
                    </div>
                    <ul class="lp-radar__runs list-unstyled mb-0">
                      <li v-for="(blip, index) in radarBlips" :key="`run-${blip.sport}`">
                        <span class="lp-radar__run-icon"><ion-icon :icon="blip.icon" aria-hidden="true" /></span>
                        <span class="lp-radar__run-text">
                          <strong>{{ blip.sport }} run</strong>
                          <span class="lp-radar__bar"><span :style="{ width: `${(blip.filled / blip.total) * 100}%`, animationDelay: `${0.9 + index * 0.2}s` }" /></span>
                        </span>
                        <span class="lp-radar__slots">{{ blip.filled }}/{{ blip.total }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <button type="button" class="lp-scroll-cue d-none d-lg-block" aria-label="Scroll to sports" @click="scrollTo('find-a-game')">
              <span />
            </button>
          </section>

          <!-- ───────────── Sports marquee ───────────── -->
          <div class="lp-marquee" aria-hidden="true">
            <div class="lp-marquee__track">
              <template v-for="copy in 2" :key="copy">
                <span v-for="sport in sports" :key="`${copy}-${sport.name}`" class="lp-marquee__item">
                  <ion-icon :icon="sport.icon" /> {{ sport.name }}
                </span>
              </template>
            </div>
          </div>

          <!-- ───────────── Sports picker ───────────── -->
          <section id="find-a-game" class="lp-section" aria-labelledby="sports-heading">
            <div class="container">
              <div class="row align-items-end g-4 mb-5">
                <div v-reveal class="col-lg-7">
                  <p class="lp-eyebrow">One community. So many ways to play.</p>
                  <h2 id="sports-heading" class="lp-heading">Pick your sport.<br />We'll find the game.</h2>
                </div>
                <div v-reveal="120" class="col-lg-5">
                  <p class="text-body-secondary mb-0">
                    From full-court runs to weekend doubles and squad matches online — GORA brings every kind of
                    player together.
                  </p>
                </div>
              </div>

              <div v-reveal class="lp-sport-tabs mb-4" role="group" aria-label="Choose a sport">
                <button
                  v-for="sport in sports"
                  :key="sport.name"
                  type="button"
                  class="btn rounded-pill lp-sport-tab"
                  :class="{ active: selectedSport === sport.name }"
                  :aria-pressed="selectedSport === sport.name"
                  @click="selectedSport = sport.name"
                >
                  <ion-icon :icon="sport.icon" aria-hidden="true" /> {{ sport.name }}
                </button>
              </div>

              <div v-reveal="100" class="row g-4 align-items-stretch">
                <div class="col-lg-8">
                  <div class="lp-sport-photo">
                    <Transition name="lp-fade" mode="out-in">
                      <img
                        :key="activeGame.image"
                        :src="activeGame.image"
                        :alt="`${activeGame.name} players in action`"
                        loading="lazy"
                        decoding="async"
                      />
                    </Transition>
                    <span class="badge rounded-pill text-bg-dark lp-photo-badge">
                      <ion-icon :icon="activeGame.icon" aria-hidden="true" /> {{ activeGame.name }}
                    </span>
                  </div>
                </div>
                <div class="col-lg-4">
                  <div v-tilt class="card h-100 lp-card" aria-live="polite">
                    <div class="card-body d-flex flex-column p-4">
                      <span class="lp-eyebrow mb-3">Illustrative game preview</span>
                      <Transition name="lp-slide" mode="out-in">
                        <div :key="activeGame.name">
                          <h3 class="h4 fw-bold mb-4">{{ activeGame.title }}</h3>
                          <ul class="list-unstyled lp-details mb-4">
                            <li><ion-icon :icon="locationOutline" aria-hidden="true" /> {{ activeGame.place }}</li>
                            <li><ion-icon :icon="timeOutline" aria-hidden="true" /> {{ activeGame.time }}</li>
                            <li><ion-icon :icon="peopleOutline" aria-hidden="true" /> {{ activeGame.spots }}</li>
                          </ul>
                        </div>
                      </Transition>
                      <router-link to="/register?redirect=/discover" class="btn btn-primary rounded-pill mt-auto">
                        Explore {{ activeGame.name.toLowerCase() }}
                        <ion-icon :icon="arrowForwardOutline" class="ms-1 align-middle" aria-hidden="true" />
                      </router-link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ───────────── Features ───────────── -->
          <section id="why-gora" class="lp-section lp-section--alt" aria-labelledby="features-heading">
            <div class="container">
              <div v-reveal class="text-center mx-auto mb-5 lp-narrow">
                <p class="lp-eyebrow">Built for the way you play</p>
                <h2 id="features-heading" class="lp-heading">Everything your game day needs.</h2>
                <p class="text-body-secondary mb-0">You bring the energy. GORA helps you find the rest.</p>
              </div>
              <div class="row g-4">
                <div v-for="(feature, index) in features" :key="feature.title" v-reveal="index * 90" class="col-md-6 col-lg-4">
                  <article v-tilt class="card h-100 lp-card lp-feature">
                    <div class="card-body p-4">
                      <span class="lp-feature__icon"><ion-icon :icon="feature.icon" aria-hidden="true" /></span>
                      <h3 class="h5 fw-bold mt-4 mb-2">{{ feature.title }}</h3>
                      <p class="text-body-secondary mb-0">{{ feature.description }}</p>
                    </div>
                  </article>
                </div>
              </div>
            </div>
          </section>

          <!-- ───────────── How it works ───────────── -->
          <section id="how-it-works" class="lp-section" aria-labelledby="how-heading">
            <div class="container">
              <div class="row align-items-end g-4 mb-5">
                <div v-reveal class="col-lg-8">
                  <p class="lp-eyebrow">From "I'm in" to game on</p>
                  <h2 id="how-heading" class="lp-heading">Less planning.<br />More showing up.</h2>
                </div>
                <div v-reveal="120" class="col-lg-4 text-lg-end">
                  <router-link to="/register" class="btn btn-outline-light rounded-pill px-4">
                    Let's get you playing <ion-icon :icon="arrowForwardOutline" class="ms-1 align-middle" aria-hidden="true" />
                  </router-link>
                </div>
              </div>
              <ol v-reveal class="row g-4 list-unstyled mb-0 lp-steps">
                <li v-for="(step, index) in steps" :key="step.title" class="col-md-4 lp-step" :style="{ '--step': index }">
                  <div class="d-flex align-items-center gap-3 mb-4">
                    <span class="lp-step__num">0{{ index + 1 }}</span>
                    <span class="lp-step__line" aria-hidden="true" />
                  </div>
                  <span class="lp-step__icon"><ion-icon :icon="step.icon" aria-hidden="true" /></span>
                  <h3 class="h5 fw-bold mt-3">{{ step.title }}</h3>
                  <p class="text-body-secondary mb-0">{{ step.description }}</p>
                </li>
              </ol>
            </div>
          </section>

          <!-- ───────────── Community ───────────── -->
          <section id="communities" class="lp-section lp-section--alt" aria-labelledby="community-heading">
            <div class="container">
              <div class="row align-items-center g-5">
                <div v-reveal class="col-lg-6">
                  <div class="lp-court">
                    <picture>
                      <source media="(max-width: 760px)" srcset="/images/gora-court-small.webp" />
                      <img src="/images/gora-court.webp" alt="An outdoor court ready for a game" loading="lazy" decoding="async" />
                    </picture>
                    <span class="lp-court__word" aria-hidden="true">Let's<br />play.</span>
                  </div>
                </div>
                <div v-reveal="140" class="col-lg-6">
                  <p class="lp-eyebrow">You don't need a whole squad</p>
                  <h2 id="community-heading" class="lp-heading">
                    Show up for the sport.<br /><span class="lp-gradient-text">Stay for the people.</span>
                  </h2>
                  <p class="text-body-secondary">
                    Getting back into a sport? Just moved to a new city? Or simply need a few more players for
                    Saturday?
                  </p>
                  <p class="text-body-secondary mb-4">
                    There's a place for you here. Build a profile around what you love, find your community, and make
                    playing part of your week.
                  </p>
                  <ul class="list-unstyled d-grid gap-3 mb-4">
                    <li v-for="point in communityPoints" :key="point" class="d-flex align-items-start gap-2">
                      <ion-icon :icon="checkmarkCircle" class="text-primary fs-5 flex-shrink-0" aria-hidden="true" />
                      <span>{{ point }}</span>
                    </li>
                  </ul>
                  <router-link to="/register" class="btn btn-primary btn-lg rounded-pill px-4 lp-btn-glow">
                    Find your people <ion-icon :icon="arrowForwardOutline" class="ms-1 align-middle" aria-hidden="true" />
                  </router-link>
                </div>
              </div>
            </div>
          </section>

          <!-- ───────────── FAQ ───────────── -->
          <section id="questions" class="lp-section" aria-labelledby="faq-heading">
            <div class="container">
              <div class="row g-5">
                <div v-reveal class="col-lg-4">
                  <p class="lp-eyebrow">A few things to know</p>
                  <h2 id="faq-heading" class="lp-heading">Good questions.<br />Straight answers.</h2>
                  <p class="text-body-secondary">Your first game starts with feeling at home.</p>
                </div>
                <div v-reveal="120" class="col-lg-8">
                  <div class="accordion lp-accordion">
                    <div v-for="(question, index) in questions" :key="question.title" class="accordion-item">
                      <h3 class="accordion-header">
                        <button
                          :id="`faq-q-${index}`"
                          type="button"
                          class="accordion-button"
                          :class="{ collapsed: openFaq !== index }"
                          :aria-expanded="openFaq === index"
                          :aria-controls="`faq-a-${index}`"
                          @click="openFaq = openFaq === index ? null : index"
                        >
                          {{ question.title }}
                        </button>
                      </h3>
                      <div
                        :id="`faq-a-${index}`"
                        class="lp-collapse"
                        :class="{ 'is-open': openFaq === index }"
                        role="region"
                        :aria-labelledby="`faq-q-${index}`"
                      >
                        <div class="lp-collapse__inner">
                          <div class="accordion-body text-body-secondary">{{ question.answer }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ───────────── Download the app ───────────── -->
          <section id="download" class="lp-section pt-0" aria-labelledby="download-heading">
            <div class="container">
              <div v-reveal class="lp-download">
                <div class="lp-download__copy">
                  <p class="lp-eyebrow mb-2">
                    <ion-icon :icon="logoAndroid" class="lp-download__android" aria-hidden="true" /> GORA for Android
                  </p>
                  <h2 id="download-heading" class="lp-heading mb-3">Take GORA everywhere.</h2>
                  <p class="text-body-secondary mb-4">
                    Get game alerts, chat with your crew, and go live from the court with the GORA app.
                  </p>

                  <a
                    v-if="APP_DOWNLOAD_URL"
                    :href="APP_DOWNLOAD_URL"
                    class="lp-dl lp-dl--solid lp-dl--lg"
                    :class="{ 'is-started': downloadStarted }"
                    download="GORA.apk"
                    @click="onDownload"
                  >
                    <span class="lp-dl__logo" aria-hidden="true"><ion-icon :icon="logoAndroid" /></span>
                    <span class="lp-dl__text">
                      <small>Download the APK</small>
                      <strong>{{ downloadStarted ? 'Downloading…' : 'Download now' }}</strong>
                    </span>
                    <span class="lp-dl__action" aria-hidden="true">
                      <Transition name="lp-pop" mode="out-in">
                        <ion-icon :key="downloadStarted ? 'done' : 'go'" :icon="downloadStarted ? checkmarkOutline : downloadOutline" />
                      </Transition>
                    </span>
                  </a>
                  <span v-else class="lp-dl lp-dl--lg is-disabled" aria-disabled="true">
                    <span class="lp-dl__logo" aria-hidden="true"><ion-icon :icon="logoAndroid" /></span>
                    <span class="lp-dl__text">
                      <small>GORA for Android</small>
                      <strong>Coming soon</strong>
                    </span>
                  </span>

                  <ul class="lp-download__meta list-unstyled">
                    <li><ion-icon :icon="checkmarkCircle" aria-hidden="true" /> Free</li>
                    <li><ion-icon :icon="checkmarkCircle" aria-hidden="true" /> Android 7.0+</li>
                    <li><ion-icon :icon="checkmarkCircle" aria-hidden="true" /> About 30 MB</li>
                  </ul>

                  <ol class="lp-download__steps list-unstyled">
                    <li v-for="(step, index) in installSteps" :key="step">
                      <span class="lp-download__step-num">{{ index + 1 }}</span>
                      <span>{{ step }}</span>
                    </li>
                  </ol>
                </div>

                <div class="lp-download__visual" aria-hidden="true">
                  <span class="lp-download__glow" />
                  <span class="lp-download__ring" />
                  <span class="lp-download__ring lp-download__ring--late" />
                  <div class="lp-phone">
                    <img src="/images/gora-court-small.webp" alt="" loading="lazy" decoding="async" />
                    <div class="lp-phone__shade" />
                    <div class="lp-phone__app">
                      <img src="/images/gora-app-icon.webp" alt="" width="72" height="72" />
                      <span>Find your game.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ───────────── Final CTA ───────────── -->
          <section class="lp-section pt-0" aria-labelledby="cta-heading">
            <div class="container">
              <div v-reveal class="lp-cta text-center">
                <p class="lp-eyebrow text-dark opacity-75">Your next "see you there" starts here</p>
                <h2 id="cta-heading" class="lp-display lp-cta__title mb-3">Your sport. Your people. Let's go.</h2>
                <p class="mb-4 lp-cta__copy">Create your account. Find your community. Play more.</p>
                <router-link to="/register" class="btn btn-dark btn-lg rounded-pill px-5">
                  Get in the game <ion-icon :icon="arrowForwardOutline" class="ms-1 align-middle" aria-hidden="true" />
                </router-link>
              </div>
            </div>
          </section>
        </main>

        <!-- ───────────── Footer ───────────── -->
        <footer class="lp-footer">
          <div class="container">
            <div class="row g-4 align-items-center">
              <div class="col-md-6">
                <router-link to="/" class="lp-brand text-body" aria-label="GORA home">
                  {{ GORA_NAME }}<span class="text-primary">/</span>
                </router-link>
                <p class="text-body-secondary small mt-2 mb-0">{{ GORA_TAGLINE }}</p>
              </div>
              <div class="col-md-6">
                <ul class="nav justify-content-md-end gap-1">
                  <li class="nav-item">
                    <button type="button" class="nav-link lp-nav-link" @click="scrollTo('how-it-works')">How it works</button>
                  </li>
                  <li class="nav-item"><router-link to="/login" class="nav-link lp-nav-link">Log in</router-link></li>
                  <li class="nav-item"><router-link to="/register" class="nav-link text-primary fw-semibold">Join GORA</router-link></li>
                </ul>
              </div>
            </div>
            <hr class="my-4" />
            <p class="small text-body-secondary mb-0">© {{ year }} GORA. Made for the love of the game.</p>
          </div>
        </footer>
      </div>
      <template v-if="!isNativeApp && APP_DOWNLOAD_URL">
        <Transition name="lp-float">
          <a
            v-if="showFab"
            slot="fixed"
            :href="APP_DOWNLOAD_URL"
            class="lp-fab"
            download="GORA.apk"
            aria-label="Download the GORA Android app"
            @click="onDownload"
          >
            <ion-icon :icon="logoAndroid" aria-hidden="true" />
            <span>Get the app</span>
            <ion-icon :icon="downloadOutline" class="lp-fab__arrow" aria-hidden="true" />
          </a>
        </Transition>
        <Transition name="lp-float">
          <div v-if="downloadStarted" slot="fixed" class="lp-toast" role="status">
            <span class="lp-toast__icon" aria-hidden="true"><ion-icon :icon="downloadOutline" /></span>
            <span class="lp-toast__text">
              <strong>Downloading GORA.apk</strong>
              <span>When it finishes, open the file to install GORA.</span>
            </span>
            <button type="button" class="lp-toast__close" aria-label="Dismiss" @click="downloadStarted = false">
              <ion-icon :icon="closeOutline" aria-hidden="true" />
            </button>
            <span class="lp-toast__bar" aria-hidden="true" />
          </div>
        </Transition>
      </template>

      <nav v-if="!isNativeApp" slot="fixed" class="lp-dock" aria-label="Quick navigation" :style="{ '--i': activeDock }">
        <span class="lp-dock__indicator" aria-hidden="true" />
        <button
          v-for="(item, index) in dockItems"
          :key="item.id"
          type="button"
          class="lp-dock__item"
          :class="{ 'is-active': activeDock === index }"
          :aria-current="activeDock === index ? 'true' : undefined"
          @click="dockGo(item.id, index)"
        >
          <ion-icon :icon="item.icon" aria-hidden="true" />
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type Directive } from 'vue';
import { RouterLink } from 'vue-router';
import { IonContent, IonIcon, IonPage } from '@ionic/vue';
import {
  arrowForwardOutline,
  basketballOutline,
  bicycleOutline,
  calendarOutline,
  chatbubblesOutline,
  checkmarkCircle,
  checkmarkOutline,
  closeOutline,
  downloadOutline,
  flashOutline,
  footballOutline,
  gameControllerOutline,
  locationOutline,
  logoAndroid,
  menuOutline,
  navigateOutline,
  peopleOutline,
  personAddOutline,
  playCircleOutline,
  searchOutline,
  tennisballOutline,
  timeOutline,
  trophyOutline,
  walkOutline,
  waterOutline,
} from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { APP_DOWNLOAD_URL, GORA_NAME, GORA_TAGLINE } from '@/constants/brand';
import '@/theme/landing-bootstrap.scss';

/** Shown under "Download now": how to install an APK from outside the Play Store. */
const installSteps = [
  'Tap Download now. GORA.apk saves to your phone.',
  'Open the file and allow installs from your browser if asked.',
  'Open GORA and sign in. You\'re in.',
];

const year = new Date().getFullYear();
/** The installed app opens straight to Sign in / Create account. */
const isNativeApp = Capacitor.isNativePlatform();

const navLinks = [
  { id: 'find-a-game', label: 'Find a game' },
  { id: 'why-gora', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'communities', label: 'Communities' },
  { id: 'questions', label: 'FAQ' },
];

const heroChips = [
  { icon: navigateOutline, label: 'Games near you', to: '/register?redirect=/discover' },
  { icon: peopleOutline, label: 'Clubs', to: '/register' },
  { icon: playCircleOutline, label: 'Reels', to: '/register?redirect=/reels' },
];

/* ───────── Hero motion ───────── */
/** Decorative shot arcs into the hoop (SVG path coordinates inside the 620×420 shots box). */
/** The app welcome screen's smaller shot box (300×220). */
const welcomeShots = ['M 0 210 Q 70 -70 196 34', 'M 290 214 Q 270 -40 196 34'];
const shots = ['M 0 400 Q 110 -140 330 40', 'M 150 420 Q 210 -70 330 40', 'M 610 410 Q 520 -130 330 40'];
/** The hero radar is a labelled preview, not live data. */
const radarBlips = [
  { sport: 'Basketball', icon: basketballOutline, km: '0.8 km', x: 44, y: 26, filled: 7, total: 10 },
  { sport: 'Volleyball', icon: basketballOutline, km: '1.4 km', x: 18, y: 58, filled: 9, total: 12 },
  { sport: 'Badminton', icon: tennisballOutline, km: '2.1 km', x: 40, y: 74, filled: 2, total: 4 },
];

/** Tap anywhere on the hero: a radar ping ripples out from that spot. */
const pings = ref<{ id: number; x: number; y: number }[]>([]);
let pingId = 0;

function ping(event: PointerEvent): void {
  if (prefersReducedMotion() || (event.target as HTMLElement).closest('a, button')) return;
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const item = { id: ++pingId, x: event.clientX - rect.left, y: event.clientY - rect.top };
  pings.value = [...pings.value.slice(-4), item];
  setTimeout(() => {
    pings.value = pings.value.filter((entry) => entry.id !== item.id);
  }, 1400);
}

const canHover = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(hover: hover) and (pointer: fine)').matches === true;
const pointerHandlers = new WeakMap<HTMLElement, { move: (event: PointerEvent) => void; leave: () => void }>();

function bindPointer(el: HTMLElement, move: (event: PointerEvent) => void, leave: () => void): void {
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerleave', leave);
  pointerHandlers.set(el, { move, leave });
}

function unbindPointer(el: HTMLElement): void {
  const handlers = pointerHandlers.get(el);
  if (!handlers) return;
  el.removeEventListener('pointermove', handlers.move);
  el.removeEventListener('pointerleave', handlers.leave);
  pointerHandlers.delete(el);
}

/** 3D tilt that follows the pointer, with a soft glare. Mouse/trackpad only. */
const vTilt: Directive<HTMLElement> = {
  mounted(el) {
    if (prefersReducedMotion() || !canHover()) return;
    el.classList.add('lp-tilt');
    bindPointer(
      el,
      (event) => {
        const rect = el.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width;
        const py = (event.clientY - rect.top) / rect.height;
        el.style.setProperty('--ry', `${((px - 0.5) * 12).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${((0.5 - py) * 12).toFixed(2)}deg`);
        el.style.setProperty('--gx', `${(px * 100).toFixed(1)}%`);
        el.style.setProperty('--gy', `${(py * 100).toFixed(1)}%`);
        el.classList.add('is-tilting');
      },
      () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
        el.classList.remove('is-tilting');
      },
    );
  },
  unmounted: unbindPointer,
};

/** Buttons lean toward the pointer a few pixels. */
const vMagnetic: Directive<HTMLElement> = {
  mounted(el) {
    if (prefersReducedMotion() || !canHover()) return;
    el.classList.add('lp-magnetic');
    bindPointer(
      el,
      (event) => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${((event.clientX - rect.left - rect.width / 2) * 0.18).toFixed(1)}px`);
        el.style.setProperty('--my', `${((event.clientY - rect.top - rect.height / 2) * 0.3).toFixed(1)}px`);
      },
      () => {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      },
    );
  },
  unmounted: unbindPointer,
};

/* ───────── Phone dock ───────── */
const dockItems = [
  { id: 'main', label: 'Arena', icon: flashOutline },
  { id: 'find-a-game', label: 'Games', icon: basketballOutline },
  { id: 'communities', label: 'Crew', icon: peopleOutline },
  { id: 'download', label: 'Get app', icon: logoAndroid },
];
const activeDock = ref(0);

function updateActiveDock(): void {
  const threshold = window.innerHeight * 0.45;
  let index = 0;
  dockItems.forEach((item, position) => {
    if (position === 0) return;
    const top = document.getElementById(item.id)?.getBoundingClientRect().top;
    if (top !== undefined && top <= threshold) index = position;
  });
  activeDock.value = index;
}

function dockGo(id: string, index: number): void {
  activeDock.value = index;
  scrollTo(id);
}

const sports = [
  { name: 'Basketball', icon: basketballOutline, image: '/images/basketball-action.png', title: 'Saturday pickup crew', place: 'Neighborhood court', time: 'Saturday · 4:00 PM', spots: '2 spots to fill' },
  { name: 'Volleyball', icon: basketballOutline, image: '/images/volleyball-action.png', title: 'Weekend volleyball', place: 'Community court', time: 'Saturday · 3:00 PM', spots: '3 spots to fill' },
  { name: 'Badminton', icon: tennisballOutline, image: '/images/badminton-action.png', title: 'A little friendly doubles', place: 'Community sports hall', time: 'Sunday · 9:00 AM', spots: '1 spot to fill' },
  { name: 'Football', icon: footballOutline, image: '/images/football-action.png', title: 'Sunday five-a-side', place: 'Neighborhood turf', time: 'Sunday · 4:00 PM', spots: '2 spots to fill' },
  { name: 'Tennis', icon: tennisballOutline, image: '/images/tennis-action.png', title: 'Morning rally session', place: 'City tennis courts', time: 'Saturday · 7:00 AM', spots: '1 partner needed' },
  { name: 'Pickleball', icon: tennisballOutline, image: '/images/pickleball-action.png', title: 'Open play pickleball', place: 'Covered courts', time: 'Friday · 6:00 PM', spots: '3 spots to fill' },
  { name: 'Running', icon: walkOutline, image: '/images/running-action.png', title: 'Easy morning miles', place: 'Your local park', time: 'Sunday · 6:00 AM', spots: 'Room for your pace' },
  { name: 'Cycling', icon: bicycleOutline, image: '/images/cycling-action.png', title: 'Sunday social ride', place: 'Meet at the bike lane', time: 'Sunday · 5:30 AM', spots: 'All paces welcome' },
  { name: 'Swimming', icon: waterOutline, image: '/images/swimming-action.png', title: 'Lap swim buddies', place: 'Community pool', time: 'Wednesday · 6:00 PM', spots: '2 lanes open' },
  { name: 'Esports', icon: gameControllerOutline, image: '/images/esports-action.png', title: 'Weekend squad matches', place: 'Online or your local gaming cafe', time: 'Saturday · 7:00 PM', spots: '2 teammates needed' },
];
const selectedSport = ref('Basketball');

/* App welcome: the sport in the copy changes every few seconds. */
const welcomeSportIndex = ref(0);
const welcomeSport = computed(() => sports[welcomeSportIndex.value % sports.length]!);
let welcomeTimer: ReturnType<typeof setInterval> | undefined;
const activeGame = computed(() => sports.find((sport) => sport.name === selectedSport.value) ?? sports[0]!);

const features = [
  { icon: navigateOutline, title: 'A game closer than you think.', description: 'Find games by sport and distance. See the time, place, and open spots before you make a plan.' },
  { icon: peopleOutline, title: 'Find your kind of team.', description: 'Join a club, meet players who share your sport, and turn a one-off game into a regular thing.' },
  { icon: calendarOutline, title: 'Make "someday" game day.', description: 'Host a game, set your player count, and bring everyone together in one place.' },
  { icon: chatbubblesOutline, title: 'Stay connected.', description: 'Club chats and direct messages keep your crew talking between games.' },
  { icon: playCircleOutline, title: 'Share the highlights.', description: 'Post photos and reels from game day so your community can relive the best plays.' },
  { icon: trophyOutline, title: 'Earn your stripes.', description: 'Collect badges as you show up, play more, and grow your sports community.' },
];

const steps = [
  { icon: personAddOutline, title: 'Make it yours.', description: 'Create your account and add the sports you love. First-timer or seasoned player — start where you are.' },
  { icon: searchOutline, title: 'Find your next game.', description: 'Explore games near you, check the details, and send a join request. Or host your own and invite people along.' },
  { icon: peopleOutline, title: 'Show up. Connect. Repeat.', description: 'Get out there, meet new people, and keep the connection going through your clubs and community.' },
];

const communityPoints = [
  'Join public clubs or request to join private ones.',
  'Host games for your club and fill open spots fast.',
  'Meet players at every skill level.',
];

const questions = [
  { title: 'Do I need to be good at my sport?', answer: "You don't need to be a pro to get started. Add your skill level to your profile and read game details to find a group that fits. Everyone starts somewhere." },
  { title: 'Can I join without knowing anyone?', answer: 'Absolutely. GORA helps you meet players through games and clubs. Find a game you like, send a join request, and let the host bring the group together.' },
  { title: 'What if there are no games near me yet?', answer: 'You can be the one who gets things going. Host a game with a location, time, and player count, or create a club and invite friends to build your local community.' },
  { title: 'Can I organize games for my club?', answer: 'Yes. Active club members can host club games. Clubs also have their own chat, so your community has a place to connect between games.' },
  { title: 'Do I need to download an app?', answer: "You can get started right here in your browser, on your phone, tablet, or computer. Create an account and you're ready to explore." },
];
const openFaq = ref<number | null>(0);

/* ───────── Navigation ───────── */
const navOpen = ref(false);
const scrolled = ref(false);

const scrollTop = ref(0);

function onScroll(event: CustomEvent<{ scrollTop: number }>): void {
  scrollTop.value = event.detail.scrollTop;
  scrolled.value = event.detail.scrollTop > 24;
  updateActiveDock();
}

/* ───────── App download ───────── */
// The link itself downloads GORA.apk; this only shows the "Downloading" feedback.
const downloadStarted = ref(false);
let downloadTimer: ReturnType<typeof setTimeout> | undefined;
/** "Get the app" floats in once the hero's download button has scrolled away. */
const showFab = computed(() => scrollTop.value > 700 && !downloadStarted.value && !navOpen.value);

function onDownload(): void {
  navOpen.value = false;
  downloadStarted.value = true;
  if (downloadTimer) clearTimeout(downloadTimer);
  downloadTimer = setTimeout(() => {
    downloadStarted.value = false;
  }, 7000);
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function scrollTo(id: string): void {
  navOpen.value = false;
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: prefersReducedMotion() ? 'instant' : 'smooth', block: 'start' });
  target.setAttribute('tabindex', '-1');
  target.focus({ preventScroll: true });
}

/* ───────── Scroll-reveal animation ───────── */
// Content is only hidden once `motionReady` is set, so it stays visible when
// JavaScript, IntersectionObserver, or motion is unavailable.
const motionReady = ref(false);
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (observer || typeof IntersectionObserver === 'undefined' || prefersReducedMotion()) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer?.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
  );
  return observer;
}

const vReveal: Directive<HTMLElement, number | undefined> = {
  mounted(el, binding) {
    el.classList.add('lp-reveal');
    if (binding.value) el.style.setProperty('--reveal-delay', `${binding.value}ms`);
    const io = getObserver();
    if (io) io.observe(el);
    else el.classList.add('is-visible');
  },
  unmounted(el) {
    observer?.unobserve(el);
  },
};

onMounted(() => {
  motionReady.value = !!getObserver();
  if (isNativeApp && !prefersReducedMotion()) {
    welcomeTimer = setInterval(() => {
      welcomeSportIndex.value += 1;
    }, 2200);
  }
});

onBeforeUnmount(() => {
  if (welcomeTimer) clearInterval(welcomeTimer);
  if (downloadTimer) clearTimeout(downloadTimer);
  observer?.disconnect();
  observer = null;
});
</script>

<style scoped lang="scss">
$accent: #ff6028;
$accent-2: #ffb347;
$ink: #101113;
$ease-out: cubic-bezier(0.2, 0.7, 0.2, 1);

.lp-content {
  --background: #{$ink};
  --padding-start: 0;
  --padding-end: 0;
}

.lp {
  min-height: 100%;
  overflow-x: hidden;
  background: var(--bs-body-bg);
  color: var(--bs-body-color);
  font-family: var(--bs-body-font-family);
  line-height: var(--bs-body-line-height);
}

.lp section {
  scroll-margin-top: 80px;
}

.lp :is(section, main):focus {
  outline: none;
}

.lp-skip {
  position: absolute;
  top: -80px;
  left: 16px;
  z-index: 100;

  &:focus {
    top: 16px;
  }
}

/* ───────── Typography helpers ───────── */
.lp-display {
  font-family: 'Gora Condensed', var(--bs-body-font-family);
  font-style: italic;
  font-weight: 800;
  font-size: clamp(3rem, 7vw, 5.6rem);
  line-height: 0.95;
  letter-spacing: -0.01em;
  text-transform: uppercase;
}

.lp-heading {
  font-weight: 800;
  font-size: clamp(2rem, 4vw, 3rem);
  line-height: 1.08;
  letter-spacing: -0.03em;
  margin-bottom: 1rem;
}

.lp-eyebrow {
  margin-bottom: 0.9rem;
  color: $accent;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.lp-gradient-text {
  background: linear-gradient(90deg, $accent, $accent-2, $accent);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: lp-shine 5s linear infinite;
}

.lp-narrow {
  max-width: 640px;
}

/* ───────── Download ───────── */
.lp-download {
  position: relative;
  display: grid;
  overflow: hidden;
  align-items: center;
  gap: clamp(2rem, 5vw, 4rem);
  padding: clamp(1.75rem, 5vw, 3.5rem);
  border: 1px solid var(--bs-border-color);
  border-radius: 1.75rem;
  background:
    radial-gradient(circle at 0% 0%, rgba(61, 220, 132, 0.12), transparent 45%),
    radial-gradient(circle at 100% 100%, rgba($accent, 0.2), transparent 55%),
    #17181b;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.75fr);
}

.lp-download__android {
  margin-right: 4px;
  color: #3ddc84;
  font-size: 1rem;
  vertical-align: -3px;
}

.lp-download__copy {
  min-width: 0;
}

.lp-download__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin: 18px 0 0;
  color: var(--bs-secondary-color);
  font-size: 0.85rem;
  font-weight: 600;

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  ion-icon {
    color: #3ddc84;
    font-size: 1rem;
  }
}

.lp-download__steps {
  display: grid;
  gap: 10px;
  margin: 26px 0 0;
  padding-top: 22px;
  border-top: 1px solid var(--bs-border-color);
  color: var(--bs-secondary-color);
  font-size: 0.9rem;

  li {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }
}

.lp-download__step-num {
  display: grid;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 50%;
  background: rgba($accent, 0.16);
  color: $accent;
  font-size: 0.75rem;
  font-weight: 800;
}

.lp-download__visual {
  position: relative;
  display: grid;
  place-items: center;
}

.lp-download__glow {
  position: absolute;
  width: 70%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: radial-gradient(circle, rgba($accent, 0.45), transparent 70%);
  filter: blur(30px);
}

.lp-phone {
  position: relative;
  width: min(220px, 100%);
  aspect-ratio: 9 / 18.5;
  overflow: hidden;
  border: 8px solid #0b0b0d;
  border-radius: 34px;
  background: #0b0b0d;
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.12),
    0 30px 60px -20px rgba(0, 0, 0, 0.8);
  transform: rotate(4deg);

  > img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.lp-phone__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.75));
}

.lp-phone__app {
  position: absolute;
  inset: auto 0 18%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #fff;
  text-align: center;

  img {
    width: 72px;
    height: 72px;
    margin-bottom: 8px;
    border-radius: 18px;
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5);
  }

  strong {
    font-size: 1.15rem;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  span {
    font-size: 0.78rem;
    opacity: 0.8;
  }
}

@keyframes lp-download-bob {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(3px);
  }
}



@media (max-width: 767.98px) {
  .lp-download {
    grid-template-columns: 1fr;
  }

  .lp-download__visual {
    display: none;
  }

  .lp-download .lp-dl {
    width: 100%;
  }
}

/* ───────── Download button ───────── */
.lp-dl {
  position: relative;
  z-index: 0;
  display: inline-flex;
  overflow: hidden;
  align-items: center;
  gap: 14px;
  padding: 10px 12px 10px 10px;
  border-radius: 18px;
  color: #fff;
  text-decoration: none;
  transition: transform 0.25s $ease-out, box-shadow 0.25s $ease-out;

  &:hover,
  &:focus-visible {
    color: #fff;
    transform: translateY(-3px);
  }

  &:active {
    transform: translateY(0) scale(0.98);
  }

  &:focus-visible {
    outline: 3px solid rgba($accent, 0.6);
    outline-offset: 3px;
  }
}

.lp-dl__logo {
  display: grid;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 13px;
  background: rgba(61, 220, 132, 0.16);
  color: #3ddc84;
  font-size: 1.6rem;
  transition: transform 0.35s $ease-out;
}

.lp-dl:hover .lp-dl__logo {
  transform: rotate(-8deg) scale(1.08);
}

.lp-dl__text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  line-height: 1.15;
  text-align: left;

  small {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  strong {
    font-size: 1.08rem;
    font-weight: 800;
    letter-spacing: -0.01em;
    white-space: nowrap;
  }
}

.lp-dl__action {
  display: grid;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  place-items: center;
  margin-left: 6px;
  border-radius: 50%;
  background: $accent;
  color: #fff;
  font-size: 1.25rem;
  transition: background 0.3s;

  ion-icon {
    animation: lp-download-bob 1.6s ease-in-out infinite;
  }
}

.lp-dl.is-started .lp-dl__action {
  background: #2fbf71;

  ion-icon {
    animation: none;
  }
}

/* Hero: dark glass with a rotating orange edge. */
.lp-dl--glass {
  box-shadow: 0 18px 40px -18px rgba($accent, 0.7);

  &::before {
    position: absolute;
    z-index: -2;
    top: 50%;
    left: 50%;
    width: 160%;
    aspect-ratio: 1;
    background: conic-gradient(from 0deg, transparent 0 55%, $accent 70%, $accent-2 80%, transparent 95%);
    content: '';
    transform: translate(-50%, -50%);
    animation: lp-spin 3.2s linear infinite;
  }

  &::after {
    position: absolute;
    z-index: -1;
    inset: 1.5px;
    border-radius: 16.5px;
    background:
      linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.09) 45%, transparent 60%) -200% 0 / 250% 100% no-repeat,
      rgba(16, 17, 19, 0.92);
    content: '';
    animation: lp-sheen 3.6s ease-in-out infinite;
  }

  &:hover {
    box-shadow: 0 22px 48px -16px rgba($accent, 0.95);
  }
}

/* Download section: solid orange with a light sweep. */
.lp-dl--solid {
  background: linear-gradient(135deg, $accent, #ff8a3d);
  box-shadow: 0 16px 38px -14px rgba($accent, 0.85);

  .lp-dl__logo {
    background: rgba(0, 0, 0, 0.18);
    color: #fff;
  }

  .lp-dl__text small {
    color: rgba(255, 255, 255, 0.85);
  }

  .lp-dl__action {
    background: #fff;
    color: $accent;
  }

  &.is-started .lp-dl__action {
    background: #fff;
    color: #2fbf71;
  }

  &::after {
    position: absolute;
    inset: 0;
    background: linear-gradient(110deg, transparent 35%, rgba(255, 255, 255, 0.35) 50%, transparent 65%) -200% 0 / 250% 100% no-repeat;
    content: '';
    pointer-events: none;
    animation: lp-sheen 3s ease-in-out infinite;
  }

  &:hover {
    box-shadow: 0 22px 46px -14px rgba($accent, 1);
  }
}

.lp-dl--lg {
  padding: 12px 14px 12px 12px;

  .lp-dl__logo {
    width: 50px;
    height: 50px;
  }

  .lp-dl__text strong {
    font-size: 1.25rem;
  }
}

.lp-dl.is-disabled {
  background: rgba(255, 255, 255, 0.08);
  box-shadow: none;
  color: var(--bs-secondary-color);
  pointer-events: none;
}

.lp-hero__get {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 18px;
  margin-top: 22px;
}

.lp-hero__get-note {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--bs-secondary-color);
  font-size: 0.82rem;
  font-weight: 600;

  ion-icon {
    color: #3ddc84;
  }
}

/* Nav: "Get the app" pill with a live dot. */
.lp-nav-download {
  position: relative;
  display: inline-flex;
  align-items: center;
  align-self: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid rgba(61, 220, 132, 0.35);
  border-radius: 999px;
  background: rgba(61, 220, 132, 0.08);
  color: var(--bs-body-color);
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;

  ion-icon {
    color: #3ddc84;
    font-size: 1.1rem;
  }

  &:hover {
    border-color: rgba(61, 220, 132, 0.7);
    background: rgba(61, 220, 132, 0.16);
    color: var(--bs-body-color);
    transform: translateY(-1px);
  }
}

.lp-nav-download__dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: $accent;
  box-shadow: 0 0 0 0 rgba($accent, 0.7);
  animation: lp-ping 1.8s ease-out infinite;
}

/* Floating "Get the app" once you scroll. */
.lp-fab {
  position: fixed;
  z-index: 50;
  right: 20px;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  border-radius: 999px;
  background: linear-gradient(135deg, $accent, #ff8a3d);
  box-shadow: 0 16px 36px -10px rgba($accent, 0.8);
  color: #fff;
  font-family: var(--bs-body-font-family, system-ui, sans-serif);
  font-size: 0.95rem;
  font-weight: 800;
  text-decoration: none;
  transition: transform 0.2s $ease-out;

  &:hover {
    color: #fff;
    transform: translateY(-2px);
  }

  > ion-icon:first-child {
    font-size: 1.3rem;
  }
}

.lp-fab__arrow {
  animation: lp-download-bob 1.6s ease-in-out infinite;
}

/* "Downloading GORA.apk" feedback. */
.lp-toast {
  position: fixed;
  z-index: 60;
  bottom: calc(20px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  display: flex;
  overflow: hidden;
  width: min(420px, calc(100% - 32px));
  align-items: center;
  gap: 12px;
  padding: 14px 12px 16px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  background: rgba(22, 23, 26, 0.94);
  box-shadow: 0 24px 50px -16px rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(14px);
  color: #f4f4f5;
  font-family: var(--bs-body-font-family, system-ui, sans-serif);
  transform: translateX(-50%);
}

.lp-toast__icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 12px;
  background: rgba($accent, 0.16);
  color: $accent;
  font-size: 1.3rem;

  ion-icon {
    animation: lp-download-bob 1.2s ease-in-out infinite;
  }
}

.lp-toast__text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  font-size: 0.82rem;
  line-height: 1.35;

  strong {
    font-size: 0.95rem;
  }

  span {
    color: #a1a1aa;
  }
}

.lp-toast__close {
  display: grid;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: #d4d4d8;
  cursor: pointer;
  font-size: 1.1rem;
}

.lp-toast__bar {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, $accent, $accent-2);
  transform-origin: left;
  animation: lp-toast-bar 7s linear forwards;
}

/* Download section phone: floats, with pulse rings behind it. */
.lp-phone {
  animation: lp-phone-float 5s ease-in-out infinite;
}

.lp-download__ring {
  position: absolute;
  width: 55%;
  aspect-ratio: 1;
  border: 2px solid rgba($accent, 0.5);
  border-radius: 50%;
  animation: lp-ring 3.2s ease-out infinite;
}

.lp-download__ring--late {
  animation-delay: 1.6s;
}

.lp-pop-enter-active,
.lp-pop-leave-active {
  transition: transform 0.2s $ease-out, opacity 0.2s;
}

.lp-pop-enter-from,
.lp-pop-leave-to {
  opacity: 0;
  transform: scale(0.4) rotate(-30deg);
}

.lp-float-enter-active,
.lp-float-leave-active {
  transition: opacity 0.3s $ease-out, translate 0.3s $ease-out;
}

.lp-float-enter-from,
.lp-float-leave-to {
  opacity: 0;
  translate: 0 24px;
}

@keyframes lp-spin {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes lp-sheen {
  0%,
  35% {
    background-position: -200% 0, 0 0;
  }
  100% {
    background-position: 250% 0, 0 0;
  }
}

@keyframes lp-ping {
  70%,
  100% {
    box-shadow: 0 0 0 9px rgba($accent, 0);
  }
}

@keyframes lp-toast-bar {
  from {
    transform: scaleX(1);
  }
  to {
    transform: scaleX(0);
  }
}

@keyframes lp-phone-float {
  0%,
  100% {
    transform: rotate(4deg) translateY(0);
  }
  50% {
    transform: rotate(2deg) translateY(-12px);
  }
}

@keyframes lp-ring {
  from {
    opacity: 0.8;
    transform: scale(0.8);
  }
  to {
    opacity: 0;
    transform: scale(1.8);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lp-dl--glass::before,
  .lp-dl--glass::after,
  .lp-dl--solid::after,
  .lp-dl__action ion-icon,
  .lp-fab__arrow,
  .lp-toast__icon ion-icon,
  .lp-nav-download__dot,
  .lp-phone,
  .lp-download__ring {
    animation: none;
  }
}

@media (max-width: 575.98px) {
  .lp-hero__get .lp-dl {
    width: 100%;
  }

  .lp-fab span {
    display: none;
  }

  .lp-fab {
    padding: 14px;
  }
}

/* ───────── Native app welcome ───────── */
.lp-welcome {
  position: relative;
  display: flex;
  min-height: 100%;
  overflow: hidden;
  isolation: isolate;
}

.lp-welcome__bg img {
  position: absolute;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: lp-zoom 18s ease-out both;
}

.lp-welcome__shade {
  position: absolute;
  inset: 0;
  z-index: -1;
  background: linear-gradient(180deg, rgba($ink, 0.35) 0%, rgba($ink, 0.75) 45%, $ink 85%);
}

.lp-welcome__body {
  display: flex;
  width: 100%;
  flex-direction: column;
  justify-content: flex-end;
  padding: calc(24px + env(safe-area-inset-top, 0px)) 24px calc(32px + env(safe-area-inset-bottom, 0px));
}

.lp-welcome__brand {
  position: absolute;
  top: calc(20px + env(safe-area-inset-top, 0px));
  left: 24px;
  font-family: 'Gora Condensed', var(--bs-body-font-family);
  font-size: 2rem;
  font-style: italic;
  font-weight: 800;
}

.lp-welcome__title {
  margin-bottom: 14px;
  font-size: clamp(2.6rem, 12vw, 3.6rem);
}

.lp-welcome__copy {
  margin-bottom: 28px;
  color: var(--bs-secondary-color);
  font-size: 1.02rem;
}

.lp-welcome__sport {
  display: inline-block;
  min-width: 5.5em;
  color: $accent;
}

.lp-word-enter-active,
.lp-word-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.lp-word-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.lp-word-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.lp-welcome__ticker {
  overflow: hidden;
  margin: 0 -24px 26px;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
}

.lp-welcome__track {
  display: flex;
  width: max-content;
  gap: 8px;
  animation: lp-marquee 26s linear infinite;
}

.lp-welcome__chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.82rem;
  white-space: nowrap;

  ion-icon {
    color: $accent;
  }
}

/* App welcome: court grid behind the copy, shots into the hoop up top. */
.lp-welcome .lp-welcome__arena {
  top: 24%;
  bottom: auto;
  height: 40%;
  mask-image: linear-gradient(to top, transparent 0%, #000 30%, #000 60%, transparent 100%);
  -webkit-mask-image: linear-gradient(to top, transparent 0%, #000 30%, #000 60%, transparent 100%);

  .lp-arena__grid {
    background-size: 44px 44px;
    animation: lp-grid-run-sm 3.5s linear infinite;
  }

  .lp-arena__circle {
    width: 160px;
    height: 160px;
  }
}

.lp-welcome .lp-welcome__shots {
  top: calc(6% + env(safe-area-inset-top, 0px));
  right: 2%;
  width: 300px;
  height: 220px;
}

.lp-welcome .lp-shots__swish.lp-welcome__swish {
  top: 34px;
  left: 196px;
}

.lp-welcome__actions .btn:active {
  transform: scale(0.97);
}

.lp-welcome .lp-blob--one {
  top: 18%;
}

.lp-welcome__actions .btn-primary {
  animation: lp-pulse-glow 2.8s ease-in-out 1.2s infinite;
}

@keyframes lp-pulse-glow {
  0%,
  100% {
    box-shadow: 0 10px 30px -10px rgba($accent, 0.7);
  }
  50% {
    box-shadow: 0 10px 40px -4px rgba($accent, 0.95);
  }
}

.lp-welcome__actions {
  display: grid;
  gap: 12px;

  .btn {
    min-height: 54px;
    font-size: 1.05rem;
  }
}

.lp-nav-signin {
  font-weight: 700;
}

/* ───────── Navbar ───────── */
.lp-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  padding-block: 1.1rem;
  padding-top: calc(1.1rem + env(safe-area-inset-top, 0px));
  background: transparent;
  transition: background 0.3s, padding 0.3s, box-shadow 0.3s, backdrop-filter 0.3s;

  &--scrolled {
    padding-block: 0.6rem;
    padding-top: calc(0.6rem + env(safe-area-inset-top, 0px));
    background: rgba(16, 17, 19, 0.82);
    backdrop-filter: blur(14px) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.07);
  }
}

.lp-brand {
  font-family: 'Gora Condensed', var(--bs-body-font-family);
  font-size: 2.1rem;
  font-style: italic;
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1;
  color: var(--bs-body-color);
}

.lp-toggler {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid var(--bs-border-color);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: var(--bs-body-color);
  font-size: 1.4rem;
}

.lp-nav-link {
  border: 0;
  background: none;
  color: var(--bs-secondary-color);
  font-size: 0.92rem;
  font-weight: 600;
  transition: color 0.2s;

  &:hover,
  &:focus-visible {
    color: $accent;
  }
}

.navbar-collapse.show {
  animation: lp-drop 0.25s $ease-out;
}

.lp-btn-glow {
  box-shadow: 0 10px 30px -10px rgba($accent, 0.7);
  transition: transform 0.2s $ease-out, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 16px 36px -10px rgba($accent, 0.85);
  }
}

.btn-outline-light:hover {
  transform: translateY(-2px);
}

.btn {
  transition: transform 0.2s $ease-out, background 0.2s, color 0.2s, border-color 0.2s, box-shadow 0.2s;
}

/* ───────── Hero ───────── */
.lp-hero {
  position: relative;
  display: flex;
  align-items: center;
  min-height: calc(100vh - 40px);
  margin-top: -84px;
  padding: 140px 0 110px;
  overflow: hidden;
  isolation: isolate;

  &__bg img {
    position: absolute;
    inset: 0;
    z-index: -3;
    width: 100%;
    height: 100%;
    object-fit: cover;
    animation: lp-zoom 18s ease-out both;
  }

  &__shade {
    position: absolute;
    inset: 0;
    z-index: -2;
    background:
      linear-gradient(90deg, rgba($ink, 0.96) 0%, rgba($ink, 0.82) 45%, rgba($ink, 0.55) 100%),
      linear-gradient(0deg, $ink 0%, transparent 35%);
  }

  &__lead {
    max-width: 520px;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;

    .btn {
      display: inline-flex;
      min-height: 52px;
      align-items: center;
      justify-content: center;
      padding-inline: 1.75rem !important;
      font-size: 1.05rem;
    }
  }
}

.lp-blob {
  position: absolute;
  z-index: -1;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.45;
  pointer-events: none;

  &--one {
    top: 10%;
    right: -6%;
    width: 420px;
    height: 420px;
    background: $accent;
    animation: lp-blob 14s ease-in-out infinite alternate;
  }

  &--two {
    bottom: -10%;
    left: 30%;
    width: 340px;
    height: 340px;
    background: #7a2cff;
    opacity: 0.25;
    animation: lp-blob 18s ease-in-out infinite alternate-reverse;
  }
}

.lp-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.55rem 1rem;
  border: 1px solid rgba($accent, 0.4);
  background: rgba($accent, 0.12);
  color: #ffd2c0;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.lp-live-dot {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: $accent;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: $accent;
    animation: lp-ping 1.6s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
}

.lp-chip {
  text-decoration: none;
  transition: border-color 0.25s, background 0.25s, color 0.25s, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--bs-secondary-color);
  font-size: 0.85rem;

  ion-icon {
    color: $accent;
  }
}

/* Hero visual (illustrative UI cards) */
.lp-stage {
  position: relative;
  min-height: 400px;
  max-width: 520px;
  margin-inline: auto;
}

.lp-glass {
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(28, 29, 33, 0.72);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.7);
}

.lp-game-card {
  position: absolute;
  top: 70px;
  left: 6%;
  width: 82%;
}

.lp-club-card {
  position: absolute;
  top: 0;
  right: 0;
  width: 62%;
}

.lp-toast-card {
  position: absolute;
  bottom: 10px;
  left: 0;
  width: 64%;
}

.lp-sport-icon,
.lp-feature__icon,
.lp-step__icon {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, $accent, $accent-2);
  color: $ink;
  font-size: 1.5rem;
}

.lp-club-logo {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 10px;
  background: #000;
  color: $accent;
  font-family: 'Gora Condensed', sans-serif;
  font-size: 0.85rem;
  font-style: italic;
  font-weight: 800;
}

.lp-progress {
  height: 8px;
  overflow: hidden;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.1);

  span {
    display: block;
    width: 80%;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, $accent, $accent-2);
    transform-origin: left;
    animation: lp-grow 1.6s 0.8s $ease-out both;
  }
}

.lp-avatars {
  display: flex;

  span {
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    margin-left: -8px;
    border: 2px solid #1c1d21;
    border-radius: 50%;
    background: #3a3d45;
    font-size: 0.65rem;
    font-weight: 700;

    &:first-child {
      margin-left: 0;
    }

    &:nth-child(2) { background: #2b5cff; }
    &:nth-child(3) { background: #13a26b; }
    &:nth-child(4) { background: #b8329a; }
  }

  &__more {
    background: rgba($accent, 0.25) !important;
    color: #ffd2c0;
  }
}

.lp-illustrative {
  opacity: 0.7;
}

.lp-scroll-cue {
  position: absolute;
  bottom: 28px;
  left: 50%;
  width: 28px;
  height: 46px;
  padding: 0;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 20px;
  background: none;
  transform: translateX(-50%);

  span {
    position: absolute;
    top: 8px;
    left: 50%;
    width: 4px;
    height: 8px;
    margin-left: -2px;
    border-radius: 2px;
    background: #fff;
    animation: lp-scroll 1.8s ease-in-out infinite;
  }
}

/* ───────── Marquee ───────── */
.lp-marquee {
  overflow: hidden;
  padding-block: 1.1rem;
  border-block: 1px solid var(--bs-border-color);
  background: linear-gradient(90deg, $accent, #ff8640);
  color: $ink;
  transform: rotate(-1.2deg) scale(1.02);

  &__track {
    display: flex;
    width: max-content;
    animation: lp-marquee 32s linear infinite;
  }

  &__item {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    padding-inline: 1.6rem;
    font-family: 'Gora Condensed', var(--bs-body-font-family);
    font-size: 1.6rem;
    font-style: italic;
    font-weight: 800;
    text-transform: uppercase;
    white-space: nowrap;
  }
}

/* ───────── Sections ───────── */
.lp-section {
  padding-block: clamp(4.5rem, 9vw, 7.5rem);

  &--alt {
    background:
      radial-gradient(circle at 15% 0%, rgba($accent, 0.08), transparent 45%),
      #15161a;
  }
}

.lp-card {
  border: 1px solid var(--bs-border-color);
  background: #1c1d21;
  border-radius: var(--bs-border-radius-lg);
}

/* Sports picker */
.lp-sport-tabs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.lp-sport-tab {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.45rem;
  padding: 0.55rem 1.1rem;
  border: 1px solid var(--bs-border-color);
  background: rgba(255, 255, 255, 0.04);
  color: var(--bs-secondary-color);
  font-weight: 600;

  &:hover {
    border-color: rgba($accent, 0.6);
    color: var(--bs-body-color);
  }

  &.active {
    border-color: $accent;
    background: $accent;
    color: $ink;
    box-shadow: 0 8px 22px -8px rgba($accent, 0.8);
  }
}

.lp-sport-photo {
  position: relative;
  overflow: hidden;
  height: 100%;
  min-height: 280px;
  aspect-ratio: 16 / 9;
  border-radius: var(--bs-border-radius-lg);
  background: #1c1d21;

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.8s $ease-out;
  }

  &:hover img {
    transform: scale(1.05);
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(0deg, rgba($ink, 0.55), transparent 50%);
    pointer-events: none;
  }
}

.lp-photo-badge {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.9rem;
  font-size: 0.85rem;
}

.lp-details li {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding-block: 0.65rem;
  border-bottom: 1px solid var(--bs-border-color);
  color: var(--bs-secondary-color);

  ion-icon {
    color: $accent;
    font-size: 1.15rem;
  }
}

/* Features */
.lp-feature {
  position: relative;
  overflow: hidden;
  transition: transform 0.35s $ease-out, border-color 0.35s, box-shadow 0.35s;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 0% 0%, rgba($accent, 0.18), transparent 60%);
    opacity: 0;
    transition: opacity 0.35s;
  }

  &:hover {
    --lift: -6px;
    border-color: rgba($accent, 0.5);
    box-shadow: 0 24px 50px -24px rgba($accent, 0.5);

    &::before {
      opacity: 1;
    }

    .lp-feature__icon {
      transform: rotate(-8deg) scale(1.08);
    }
  }

  .card-body {
    position: relative;
  }

  &__icon {
    transition: transform 0.35s $ease-out;
  }
}

/* Steps */
.lp-step__num {
  color: $accent;
  font-family: 'Gora Condensed', var(--bs-body-font-family);
  font-size: 2.4rem;
  font-style: italic;
  font-weight: 800;
  line-height: 1;
}

.lp-step__line {
  flex: 1;
  height: 2px;
  background: linear-gradient(90deg, $accent, transparent);
  transform-origin: left;
}

.lp-step__icon {
  width: 52px;
  height: 52px;
  border: 1px solid var(--bs-border-color);
  background: #1c1d21;
  color: $accent;
}

/* Community */
.lp-court {
  position: relative;
  overflow: hidden;
  border-radius: var(--bs-border-radius-lg);
  box-shadow: 0 40px 80px -40px rgba($accent, 0.45);

  img {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;
    transition: transform 1s $ease-out;
  }

  &:hover img {
    transform: scale(1.04);
  }

  &__word {
    position: absolute;
    bottom: 1.2rem;
    left: 1.4rem;
    color: #fff;
    font-family: 'Gora Condensed', var(--bs-body-font-family);
    font-size: clamp(2.6rem, 6vw, 4.2rem);
    font-style: italic;
    font-weight: 800;
    line-height: 0.9;
    text-shadow: 0 6px 30px rgba(0, 0, 0, 0.6);
    text-transform: uppercase;
  }
}

/* FAQ accordion */
.lp-accordion {
  --bs-accordion-bg: #1c1d21;
  --bs-accordion-border-color: var(--bs-border-color);
  --bs-accordion-border-radius: var(--bs-border-radius-lg);
  --bs-accordion-inner-border-radius: var(--bs-border-radius-lg);
  --bs-accordion-btn-padding-y: 1.25rem;
  --bs-accordion-active-bg: rgba(255, 96, 40, 0.1);
  --bs-accordion-active-color: #{$accent};
  --bs-accordion-btn-focus-box-shadow: 0 0 0 0.2rem rgba(255, 96, 40, 0.35);

  .accordion-item {
    margin-bottom: 0.75rem;
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius-lg) !important;
    overflow: hidden;
  }

  .accordion-button {
    font-weight: 700;
    border-radius: 0 !important;
  }
}

.lp-collapse {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.35s $ease-out;

  &.is-open {
    grid-template-rows: 1fr;
  }

  &__inner {
    overflow: hidden;
  }
}

/* Final CTA */
.lp-cta {
  position: relative;
  overflow: hidden;
  padding: clamp(3rem, 7vw, 5.5rem) clamp(1.25rem, 5vw, 4rem);
  border-radius: 2rem;
  background: linear-gradient(120deg, $accent, $accent-2, #ff3d5a, $accent);
  background-size: 300% 300%;
  color: $ink;
  animation: lp-gradient 10s ease infinite;

  &::before {
    content: '';
    position: absolute;
    inset: -40%;
    background: repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.08) 0 2px, transparent 2px 60px);
    pointer-events: none;
  }

  > * {
    position: relative;
  }

  &__title {
    font-size: clamp(2.6rem, 6.5vw, 5rem);
  }

  &__copy {
    font-size: 1.1rem;
    font-weight: 600;
  }
}

/* Footer */
.lp-footer {
  padding-block: 3rem calc(2rem + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--bs-border-color);
}

/* ───────── Entrance & reveal animations ───────── */
.lp-enter {
  animation: lp-up 0.8s $ease-out both;
  animation-delay: var(--enter-delay, 0ms);
}

.lp-float {
  animation: lp-float 6s ease-in-out infinite;

  &--slow {
    animation-duration: 8s;
    animation-delay: -2s;
  }

  &--fast {
    animation-duration: 5s;
    animation-delay: -1s;
  }
}

.lp-reveal {
  transition:
    opacity 0.8s $ease-out var(--reveal-delay, 0ms),
    transform 0.8s $ease-out var(--reveal-delay, 0ms);
}

.lp--motion .lp-reveal:not(.is-visible) {
  opacity: 0;
  transform: translateY(32px);
}

.lp--motion .lp-steps:not(.is-visible) .lp-step__line {
  transform: scaleX(0);
}

.lp-steps .lp-step__line {
  transition: transform 1s $ease-out calc(var(--step) * 250ms + 300ms);
}

.lp-fade-enter-active,
.lp-fade-leave-active {
  transition: opacity 0.35s ease, transform 0.5s $ease-out;
}

.lp-fade-enter-from {
  opacity: 0;
  transform: scale(1.06);
}

.lp-fade-leave-to {
  opacity: 0;
}

.lp-slide-enter-active,
.lp-slide-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.lp-slide-enter-from {
  opacity: 0;
  transform: translateX(16px);
}

.lp-slide-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

@keyframes lp-up {
  from { opacity: 0; transform: translateY(28px); }
  to { opacity: 1; transform: none; }
}

@keyframes lp-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
}

@keyframes lp-blob {
  from { transform: translate(0, 0) scale(1); }
  to { transform: translate(-60px, 40px) scale(1.15); }
}

@keyframes lp-zoom {
  from { transform: scale(1.12); }
  to { transform: scale(1); }
}

@keyframes lp-ping {
  75%, 100% { transform: scale(2.4); opacity: 0; }
}

@keyframes lp-grow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

@keyframes lp-scroll {
  0% { opacity: 0; transform: translateY(0); }
  30% { opacity: 1; }
  100% { opacity: 0; transform: translateY(16px); }
}

@keyframes lp-marquee {
  to { transform: translateX(-50%); }
}

@keyframes lp-shine {
  to { background-position: 200% center; }
}

@keyframes lp-gradient {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

@keyframes lp-drop {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: none; }
}

/* ───────── Responsive ───────── */
@media (max-width: 991.98px) {
  .lp-nav {
    background: rgba(16, 17, 19, 0.82);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }

  .lp-hero {
    min-height: auto;
    padding: 130px 0 100px;
  }

  .lp-stage {
    min-height: 360px;
  }

  .lp-sport-photo {
    min-height: 220px;
  }
}

@media (max-width: 575.98px) {
  .lp-hero {
    padding: 112px 0 56px;
  }

  .lp-display {
    font-size: clamp(2.6rem, 13vw, 3.4rem);
  }

  .lp-hero__lead {
    font-size: 1rem;
  }

  .lp-hero__actions .btn {
    flex: 1 1 0;
    min-height: 48px;
    padding-inline: 1rem !important;
    font-size: 0.95rem;
  }

  .lp-pill {
    font-size: 0.64rem;
    letter-spacing: 0.1em;
  }

  .lp-chip {
    padding: 0.3rem 0.7rem;
    font-size: 0.78rem;
  }

  .lp-marquee {
    padding-block: 0.8rem;
    transform: none;
  }

  .lp-stage {
    min-height: 330px;
  }

  .lp-game-card {
    left: 0;
    width: 100%;
  }

  .lp-club-card {
    width: 78%;
  }

  .lp-toast-card {
    width: 82%;
  }

  .lp-marquee__item {
    padding-inline: 1.1rem;
    font-size: 1.15rem;
  }

  .lp-section {
    padding-block: 3.5rem;
  }

  .lp-heading {
    font-size: 1.85rem;
  }

  .lp-cta {
    border-radius: 1.25rem;
  }
}

/* ═════════ Arena motion layer ═════════ */
$spring: cubic-bezier(0.22, 1, 0.36, 1);
$bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
$emerald: #25d366;

/* Tilted glowing court grid under the hero. */
.lp-arena {
  position: absolute;
  z-index: -1;
  right: -20%;
  bottom: -4%;
  left: -20%;
  height: 52%;
  perspective: 900px;
  pointer-events: none;
  mask-image: linear-gradient(to top, #000 35%, transparent 100%);
  -webkit-mask-image: linear-gradient(to top, #000 35%, transparent 100%);
}

.lp-arena__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba($accent, 0.32) 1px, transparent 1px),
    linear-gradient(90deg, rgba($accent, 0.32) 1px, transparent 1px);
  background-size: 64px 64px;
  transform: rotateX(58deg);
  transform-origin: 50% 100%;
  animation: lp-grid-run 5s linear infinite;
}

.lp-arena__line {
  position: absolute;
  top: 46%;
  right: 0;
  left: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, $accent, transparent);
  box-shadow: 0 0 18px $accent;
}

.lp-arena__circle {
  position: absolute;
  top: 46%;
  left: 50%;
  width: 260px;
  height: 260px;
  border: 2px solid rgba($accent, 0.85);
  border-radius: 50%;
  box-shadow: 0 0 24px rgba($accent, 0.6), inset 0 0 24px rgba($accent, 0.35);
  transform: translate(-50%, -50%);
  animation: lp-court-glow 3s ease-in-out infinite;
}

/* Shot arcs + swish burst. */
.lp-shots {
  position: absolute;
  z-index: -1;
  top: 12%;
  right: 3%;
  width: 620px;
  height: 420px;
  pointer-events: none;

  svg {
    position: absolute;
    inset: 0;
    overflow: visible;
  }
}

.lp-shots__trail {
  fill: none;
  stroke: rgba($accent-2, 0.75);
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  stroke-linecap: round;
  stroke-width: 2;
  filter: drop-shadow(0 0 6px rgba($accent, 0.9));
  animation: lp-trail 4.8s $spring infinite both;
}

.lp-shots__ball {
  position: absolute;
  top: 0;
  left: 0;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background:
    radial-gradient(circle at 35% 30%, #ffd1a8, transparent 40%),
    radial-gradient(circle, #ff8a3d, $accent 70%);
  box-shadow: 0 0 18px rgba($accent, 0.9), 0 0 40px rgba($accent, 0.5);
  offset-rotate: 0deg;
  opacity: 0;
  animation: lp-shot 4.8s $spring infinite both;
}

.lp-shots__swish {
  position: absolute;
  top: 40px;
  left: 330px;
  width: 0;
  height: 0;

  &::before {
    position: absolute;
    top: -26px;
    left: -26px;
    width: 52px;
    height: 52px;
    border: 2px solid $accent-2;
    border-radius: 50%;
    content: '';
    opacity: 0;
    animation: inherit;
    animation-name: lp-swish-ring;
  }

  span {
    position: absolute;
    top: -3px;
    left: -3px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    box-shadow:
      0 -24px $accent-2, 17px -17px $accent, 24px 0 $accent-2, 17px 17px $accent,
      0 24px $accent-2, -17px 17px $accent, -24px 0 $accent-2, -17px -17px $accent;
    opacity: 0;
    animation: inherit;
    animation-name: lp-swish-dots;
  }
}

.lp-shots__swish {
  animation: lp-noop 4.8s linear infinite both;
}

/* Tap-to-ping radar ripple. */
.lp-ping {
  position: absolute;
  z-index: -1;
  width: 40px;
  height: 40px;
  margin: -20px 0 0 -20px;
  border: 2px solid rgba($accent, 0.9);
  border-radius: 50%;
  pointer-events: none;
  animation: lp-ping-out 1.3s $spring forwards;

  &::after {
    position: absolute;
    inset: -2px;
    border: 2px solid rgba($emerald, 0.8);
    border-radius: 50%;
    content: '';
    animation: lp-ping-out 1.3s 0.18s $spring forwards;
  }
}

/* "Games near you" radar card. */
.lp-radar {
  position: relative;
  padding: 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 26px;
  background: rgba(18, 19, 23, 0.72);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 30px 60px -25px rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.lp-radar__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lp-radar__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 0.92rem;
  font-weight: 800;
}

.lp-radar__tag {
  padding: 3px 9px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  color: #9ca3af;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.lp-pulse {
  display: inline-block;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: $emerald;
  box-shadow: 0 0 0 0 rgba($emerald, 0.7);
  animation: lp-pulse-green 1.6s ease-out infinite;
}

.lp-radar__scope {
  position: relative;
  overflow: hidden;
  margin: 16px 0;
  border: 1px solid rgba($accent, 0.35);
  border-radius: 50%;
  aspect-ratio: 1;
  background: radial-gradient(circle, rgba($accent, 0.1), rgba(10, 10, 12, 0.65) 72%);

  &::before,
  &::after {
    position: absolute;
    background: rgba($accent, 0.18);
    content: '';
  }

  &::before {
    top: 50%;
    right: 0;
    left: 0;
    height: 1px;
  }

  &::after {
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
  }
}

.lp-radar__ring {
  position: absolute;
  border: 1px dashed rgba($accent, 0.28);
  border-radius: 50%;
}

.lp-radar__sweep {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(from 0deg, rgba($accent, 0.5), rgba($accent, 0.08) 18%, transparent 26%);
  animation: lp-radar-spin 4s linear infinite;
}

.lp-radar__you {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: $accent;
  box-shadow: 0 0 0 6px rgba($accent, 0.25);
  transform: translate(-50%, -50%);
}

.lp-radar__blip {
  position: absolute;
  z-index: 1;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border-radius: 50%;
  background: $emerald;
  animation: lp-pulse-green 2s ease-out infinite;
}

.lp-radar__label {
  position: absolute;
  top: -7px;
  left: 18px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(10, 10, 12, 0.8);
  color: #fff;
  font-size: 0.66rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  white-space: nowrap;

  ion-icon {
    color: $accent;
  }
}

.lp-radar__runs {
  display: grid;
  gap: 10px;

  li {
    display: flex;
    align-items: center;
    gap: 10px;
  }
}

.lp-radar__run-icon {
  display: grid;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 10px;
  background: rgba($accent, 0.14);
  color: $accent;
}

.lp-radar__run-text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 5px;

  strong {
    color: #fff;
    font-size: 0.8rem;
  }
}

.lp-radar__bar {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);

  span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, $accent, $accent-2);
    transform-origin: left;
    animation: lp-bar-fill 1.2s $spring both;
  }
}

.lp-radar__slots {
  color: #9ca3af;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}

/* 3D tilt (pointer devices). */
.lp-tilt {
  position: relative;
  transform: perspective(900px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg)) translateY(var(--lift, 0px));
  transform-style: preserve-3d;
  transition: transform 0.6s $spring, border-color 0.35s, box-shadow 0.35s;
  will-change: transform;

  &.is-tilting {
    transition: transform 0.08s linear, border-color 0.35s, box-shadow 0.35s;
  }

  &::after {
    position: absolute;
    z-index: 2;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(circle at var(--gx, 50%) var(--gy, 50%), rgba(255, 255, 255, 0.13), transparent 45%);
    content: '';
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
  }

  &.is-tilting::after {
    opacity: 1;
  }
}

/* Magnetic pills + spring arrows + ember glow. */
.lp-magnetic {
  transform: translate(var(--mx, 0px), var(--my, 0px));
}

.lp-btn-glow.lp-magnetic:hover,
.btn-outline-light.lp-magnetic:hover {
  transform: translate(var(--mx, 0px), calc(var(--my, 0px) - 2px));
}

.lp-btn-glow {
  position: relative;

  ion-icon {
    transition: transform 0.45s $bounce;
  }

  &:hover ion-icon {
    transform: translateX(4px);
  }

  &::after {
    position: absolute;
    z-index: -1;
    inset: 25% 8% -35%;
    border-radius: 999px;
    background: radial-gradient(closest-side, rgba($accent, 0.75), transparent);
    content: '';
    filter: blur(12px);
    opacity: 0;
    transition: opacity 0.3s;
  }

  &:hover::after {
    opacity: 1;
    animation: lp-ember 1.1s ease-in-out infinite alternate;
  }

  &:hover {
    background-color: #ff6e38;
    border-color: #ff6e38;
  }
}

.lp .btn-outline-light {
  position: relative;
  overflow: hidden;
  isolation: isolate;

  &::before {
    position: absolute;
    z-index: -1;
    inset: 0;
    background: linear-gradient(110deg, transparent 30%, rgba($accent, 0.4) 50%, transparent 70%);
    content: '';
    transform: translateX(-120%);
    transition: transform 0.8s $spring;
  }

  &:hover {
    border-color: $accent;
    background: rgba($accent, 0.08);
    box-shadow: 0 0 0 1px rgba($accent, 0.4), 0 0 22px -4px rgba($accent, 0.6);
    color: #fff;
  }

  &:hover::before {
    transform: translateX(120%);
  }
}

a.lp-chip {
  &:hover,
  &:focus-visible {
    border-color: rgba($accent, 0.6);
    background: rgba($accent, 0.1);
    color: #fff;
    transform: translateY(-2px);
  }

  &:hover ion-icon,
  &:focus-visible ion-icon {
    filter: drop-shadow(0 0 6px $accent);
  }
}

/* Floating glass dock (phones/tablets). */
.lp-dock {
  position: fixed;
  z-index: 55;
  bottom: calc(14px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  display: none;
  width: min(420px, calc(100% - 24px));
  padding: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: rgba(18, 19, 23, 0.78);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 20px 40px -12px rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  transform: translateX(-50%);
  grid-template-columns: repeat(4, 1fr);
}

.lp-dock__indicator {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 6px;
  width: calc((100% - 12px) / 4);
  border-radius: 999px;
  background: #ff571a;
  box-shadow: 0 8px 24px -6px rgba(255, 87, 26, 0.75);
  transform: translateX(calc(var(--i, 0) * 100%));
  transition: transform 0.5s $bounce;
}

.lp-dock__item {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 7px 0 6px;
  border: 0;
  background: none;
  color: #9ca3af;
  cursor: pointer;
  font-family: var(--bs-body-font-family, system-ui, sans-serif);
  font-size: 0.66rem;
  font-weight: 800;
  transition: color 0.3s;

  ion-icon {
    font-size: 1.25rem;
    transition: transform 0.45s $bounce;
  }

  &.is-active {
    color: #0a0a0c;

    ion-icon {
      transform: translateY(-1px) scale(1.12);
    }
  }
}

@media (max-width: 991.98px) {
  .lp-dock {
    display: grid;
  }

  .lp-fab {
    display: none;
  }

  .lp-toast {
    bottom: calc(86px + env(safe-area-inset-bottom, 0px));
  }

  .lp-footer {
    padding-bottom: calc(6.5rem + env(safe-area-inset-bottom, 0px));
  }

  .lp-arena {
    height: 40%;
  }

  .lp-arena__circle {
    width: 180px;
    height: 180px;
  }
}

@keyframes lp-grid-run-sm {
  to {
    background-position: 0 44px, 0 0;
  }
}

@keyframes lp-grid-run {
  to {
    background-position: 0 64px, 0 0;
  }
}

@keyframes lp-court-glow {
  50% {
    box-shadow: 0 0 40px rgba($accent, 0.9), inset 0 0 36px rgba($accent, 0.5);
  }
}

@keyframes lp-trail {
  0% {
    opacity: 0;
    stroke-dashoffset: 1;
  }
  6% {
    opacity: 1;
  }
  48% {
    opacity: 1;
    stroke-dashoffset: 0;
  }
  70%,
  100% {
    opacity: 0;
    stroke-dashoffset: 0;
  }
}

@keyframes lp-shot {
  0% {
    offset-distance: 0%;
    opacity: 0;
  }
  6% {
    opacity: 1;
  }
  48% {
    offset-distance: 100%;
    opacity: 1;
  }
  52%,
  100% {
    offset-distance: 100%;
    opacity: 0;
  }
}

@keyframes lp-swish-ring {
  0%,
  46% {
    opacity: 0;
    transform: scale(0.2);
  }
  50% {
    opacity: 1;
  }
  72%,
  100% {
    opacity: 0;
    transform: scale(1.7);
  }
}

@keyframes lp-swish-dots {
  0%,
  46% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
  }
  75%,
  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}

@keyframes lp-noop {
  to {
    opacity: 1;
  }
}

@keyframes lp-ping-out {
  from {
    opacity: 1;
    transform: scale(0.2);
  }
  to {
    opacity: 0;
    transform: scale(6);
  }
}

@keyframes lp-radar-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes lp-pulse-green {
  70%,
  100% {
    box-shadow: 0 0 0 10px rgba($emerald, 0);
  }
}

@keyframes lp-bar-fill {
  from {
    transform: scaleX(0);
  }
}

@keyframes lp-ember {
  from {
    transform: scale(0.92);
  }
  to {
    transform: scale(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lp-dock__indicator,
  .lp-dock__item ion-icon {
    transition: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lp *,
  .lp *::before,
  .lp *::after {
    animation: none !important;
    transition: none !important;
  }

  .lp-marquee__track {
    flex-wrap: wrap;
    width: auto;
  }
}
</style>
