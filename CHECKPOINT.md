# PolyRich 2D Multiplayer Board Game - Build Progress & Checkpoint

## 🌟 Delivered & Active Features

### 1. Reusable Board Templates (No Need to Re-Customize Every Game!)
- **Permanent Storage:** When you customize your board in the Board Editor (cities, photos, rewards, punishments, rules), click **"Save As Default Template"**.
- **Auto-Load on Every New Game:** When you click "Create Room" on the home screen, your saved custom board is loaded automatically. You never have to re-edit from scratch unless you want to make new changes!
- Checkbox toggle on the home screen: `[x] Use saved custom board for new rooms`.

### 2. RichUp.io Player-to-Player Trading System
- Click **"Trade Deals"** in the center panel anytime during gameplay.
- Select any active rival player to trade with.
- Choose properties to offer + cash to offer.
- Choose properties requested + cash requested.
- Real-time **Incoming Trade Proposal** modal appears on target player's screen with `[Accept Trade]` and `[Decline]`.
- Atomic asset and cash transfer on backend upon acceptance.

### 3. RichUp.io Live Property Auctions
- When a player lands on an unowned property and clicks **"Skip"**:
  - The property automatically goes to a **Live Auction** open to all players!
  - 15-second countdown timer bar with anti-sniping (+5 seconds if bid placed near the end).
  - Quick bid increment buttons: `+ $10`, `+ $50`, `+ $100` and custom bid input.
  - Highest bidder wins the deed and pays the bank.

### 4. RichUp.io Mortgages & Bankruptcy
- Click any owned unimproved property to open its deed and click **"Mortgage"** to instantly receive 50% of its value in cash.
- Mortgaged properties show a 🔒 icon and do not collect rent until unmortgaged.
- Unmortgage anytime for 55% value (50% + 10% fee).
- **"Bankrupt"** button allows players in financial deficit to declare bankruptcy, liquidating properties and eliminating the player.

### 5. High-Visibility Enlarged Board Icons & Typography
- Icons enlarged by ~200% (`w-5 h-5` to `w-8 h-8` drop shadow icons for Start, Jail, Bonus, Taxes, Transit, Rewards).
- User-uploaded photos expanded to fill prominent tile slots.
- Location names rendered in bold high-contrast text (`text-[8px] sm:text-[10px] md:text-[11px] font-black`).
- Price badges rendered in vibrant green (`text-emerald-300 font-black`).
- Responsive square perimeter sizing fitted to both mobile screens and laptops without clipping.
