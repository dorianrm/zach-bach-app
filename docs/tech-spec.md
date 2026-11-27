# Zach Bach Weekend Site: Tech Spec (high level, v1)

Last updated: Tue Nov 24, 2026. Owner: Dorian.
This file is the source of truth for scope.
Implementation details: `docs/implementation.md`.
Visual design is locked in the Design section of `docs/implementation.md`. Claude owns design and full-stack build choices.

## Overview

A bare-minimum web app for the Dec 18-19 weekend. It does five things: show the weekend itinerary, collect weekend photos in a shared gallery, run dinner bingo, run the bar crawl, and keep a crawl scoreboard. Everything else stays on paper or in the group chat until the core works.

Guests open one shared link on their phones. No accounts, no app install.

## Core features (v1 / MVP)

| Feature | What it does | When | Paper fallback |
| --- | --- | --- | --- |
| Weekend itinerary | Static page with Friday and Saturday cards: times, venues, addresses, map links, a short description, and what to bring or wear. The crawl shows as one card, with no stops listed. | From the first link out, all weekend | Pinned group chat message |
| Photo gallery | Guests upload photos from the weekend, with an optional one-line caption. Zach can view and download them all. | Uploads open Fri Dec 18, kept after the weekend | Shared Google Photos album |
| Dinner bingo | Individual 5x5 card on each phone, shuffled per guest. Tap to mark, honor system. First three line finishers win a prize and a crawl head start for their team. | Fri dinner | Printed cards |
| Crawl hub | Rules, team rosters, the itinerary, and the challenges at each stop with their point values. Guests view only. Dorian awards points. | Fri crawl | Passport card per guest |
| Crawl scoreboard | Team standings for the crawl only. Dorian's awards add to it. | Fri crawl | Zach's tally sheet |

## Weekend itinerary

The home page. One card per event, grouped by day.

| Day | Time | Event | Place | Notes |
| --- | --- | --- | --- | --- |
| Fri | 7:00-9:30 PM | Dinner | Fogo de Chao, 930 SW 6th Ave, Portland | Main dining room |
| Fri | 9:30 PM-~1:00 AM (estimate) | Bar crawl | Old Town Portland | Stops revealed live |
| Sat | TBD, afternoon | Topgolf | Topgolf Hillsboro | Food included |
| Sat | TBD, evening | Dinner and drinks | Pub near the airsoft arena, TBD | Keep drinks light before airsoft |
| Sat | 8:30-10:30 PM | Private airsoft | Oregon Airsoft Arena, 1600 NE 25th Ave, Hillsboro | Arrive 15-30 min early |

**Card fields**

- Required: day, title
- Optional: start and end time (or TBD), place and address, description, getting there, what to wear or bring, cost estimate, arrive-early note, notes list (ID, waivers, shoes)
- A card shows only the fields that are filled in. New details are added without a design change.

**Page features (MVP):** map link on each address, add to calendar (Apple or Google, pick the events you attend), "happening now" highlight in Pacific time, link preview in the group chat, "last updated" stamp, Venmo link to pay Dorian.

**Later:** countdown to the next event, offline mode, optional or attendance tags per card.

**Details to fill in:** Saturday start times for Topgolf and the pub, pub name and address, ID/waiver/shoe rules, cost estimates, Venmo handle.

## Photo gallery

One shared album, for photos taken during the weekend only. Photos only, no video.

**Decisions**

- Uploads open Fri Dec 18 at 6:00 PM and close Sun Dec 20 at noon.
- Every guest sees all photos right away. Dorian hides anything that should not be there.
- Zach can see the gallery at any time.
- Upload prompt: "Anything from this weekend." No upload cap.
- Each photo shows its uploader. Guests can delete only their own photos.
- After the weekend, Dorian exports all photos to a Google Photos album for Zach. The site is not the long-term home.

**Tags**

- Tag list comes from the itinerary cards: `Dinner`, `Crawl`, `Topgolf`, `Pub`, `Airsoft`.
- Auto from time taken: the photo timestamp is matched to an itinerary card. No timestamp = the card happening at upload time.
- A photo taken outside the weekend gets no tag. Dorian can hide it.
- Manual override at upload from the fixed list. No free-text tags. Dorian can edit any tag.

**Page features (MVP):** multi-photo upload, resize on the phone before upload (also converts HEIC to JPEG), thumbnails in the grid with full size on tap, caption and uploader name, filter by tag, download one photo, admin hide.

**Later:** download all as a zip, reactions, video.

**Stack limits:** Supabase free plan has 1 GB storage, 50 MB per file, 5 GB egress, and pauses after 1 week of inactivity (https://supabase.com/pricing). Storage estimate ~130 MB. Thumbnails keep egress low. No video and no server-side zip in v1.

## Dinner bingo

- 5x5 with a free center. Every guest gets the same 24 tiles, shuffled. A reload shows the same card.
- Honor system for every tile. No confirmation step.
- First three guests to finish a line win a prize. Their teams also get a crawl head start: 3, 2, and 1 points.
- Each guest's team comes from the guest list, so guests do not need to know their team at dinner.
- Zach does not play.
- No open or lock window in v1.
- Tiles are finalized during implementation. Draft tiles live in the project's weekend plan.

**Page features (MVP):** shuffled card per guest, tap to mark and undo (saved on the server), auto bingo detection with a 1st/2nd/3rd banner, head start points posted to the crawl scoreboard automatically.

**Later:** open and lock window, Zach confirmation for Zach tiles, "who's close" board, witness tagging.

## Crawl hub

One page for the crawl: rules, rosters, the current stop, and its challenges. Guests only view it. Dorian runs it.

- No guest claims. No proof photos. Dorian awards every point from the admin screen.
- Rosters stay hidden until Dorian taps "Reveal teams." The scoreboard stays hidden until then too.
- Guests see changes within a few seconds.

**Guest view (MVP):** rules, team rosters with colors (own team highlighted), current stop with a map link and its challenges and points, past stops collapsed below.

**Admin screen (MVP):** "Reveal teams", "Next stop", award in 2 taps (challenge, then team), head-to-head placement (1st/2nd/3rd), "+N for team" bonus, undo last award.

**Later:** guest claims and a claim feed, proof photos, push notification when a stop opens, timer per stop.

**To decide:** reveal stops one at a time (default: yes). Stops, challenges, points, team names, colors, and rules during implementation.

## Crawl scoreboard

- Lives at the top of the crawl hub page. Hidden until "Reveal teams."
- Shows team totals. Tap a team to see its point history.
- Bingo head starts show as history lines, such as "Bingo 1st: +3."
- Dorian adds all other points. Undo fixes a wrong award.
- Dorian taps "Final" to end the crawl. Every phone shows the winning team.
- Tie: Zach picks a tiebreaker game. Dorian enters the result as +1.
- Zach's paper tally is the backup.

**Later:** carry the scoreboard into Saturday.

## Access

Name plus a 4-digit PIN. One group-chat link works for everyone, on any browser.

1. The event code in the link opens the name picker.
2. The guest picks their name from the guest list.
3. First time: the guest sets a 4-digit PIN. Later, on any device: they enter it.
4. The server sets a signed, httpOnly session cookie with the guest's id. It lasts 30 days.

- Guests choose their own PIN. Dorian can view and reset any guest PIN on the admin page.
- A phone already signed in cannot set up another name.
- The PIN setup screen says: "Pick a PIN for your profile."
- Guest PINs are stored encrypted. 5 wrong tries lock a name for 10 minutes.
- Dorian is the only admin. Dorian signs in with a 6-digit admin PIN stored hashed, with 10 tries. Admin unlocks for 12 hours at a time.
- Guests trying wrong PINs on Dorian's name cannot block admin on Dorian's signed-in phone.
- Every admin action is checked on the server.

**Later:** personal link per guest, real login (email or SMS code).

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| App | Next.js on Vercel | Server-side checks keep secrets out of the browser. Deploys on git push. |
| Data and photos | Supabase | Database and file storage in one place. Private photo storage by default. Free tier fits the group size. |

## Next iteration (v2)

**Keepsakes for Zach:** Book of Zach, throwback photos, written submissions, messages from people who can't attend, marriage time capsule, disposable camera per team.

**Dinner:** secret missions, dessert memory cards, newlywed quiz, Zach trivia, hot seat chair queue, traveling question cards, team reveal at the seat.

**Bar crawl:** guest claims and proof photos, story wall and "Who Wrote It?", slideshow at the first bar, toasts, team group chats, captain PINs.

**Saturday and the weekend:** weekend-long scoreboard, Zach props board, superlatives, groom's choice across the weekend.

**Technical:** live push updates, offline queue and retry, custom domain.

## Open decisions

- [ ] Bingo prize for the top three
- [ ] Reveal stops one at a time, or show the full route at the start?
- [ ] Extend the scoreboard to Saturday later, or keep it crawl only?
- [ ] Final bingo tiles (during implementation)
