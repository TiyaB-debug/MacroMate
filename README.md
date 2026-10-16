# MacroMate

**Track your macros, cook from your pantry, and find recipes that fit your goals.**

MacroMate is a mobile app for iOS and Android that makes nutrition tracking simple. Log meals in a few taps, see where your calories come from at a glance, and get recipe ideas based on what's already in your kitchen, all while respecting your diet and allergies.


## Features

### Personalized setup
A short onboarding flow asks about your age, height, weight, goals, dietary preferences, and allergies. MacroMate then suggests daily calorie and macro targets (using the Mifflin-St Jeor equation), or you can enter your own.

### Daily tracking
- A color-coded **calorie ring** shows how much of your daily goal comes from breakfast, lunch, dinner, and snacks
- **Protein, carbs, and fat** progress bars
- Log food by entering individual ingredients or adding a saved recipe in one tap

### Recipe library
- Save your own recipes with ingredients, steps, tags, and nutrition per serving
- Search and filter by meal type or favorites
- Each recipe shows which ingredients you already have at home

### Pantry
- Track ingredients by category with expiration dates
- A **"Use soon"** alert for items about to expire

### Create from Pantry
Tell MacroMate what you're craving and it ranks your recipes by how many ingredients you already have, automatically excluding your allergies, diet restrictions, and foods you dislike.

---

## Tech Stack

| Layer | Technology |
|---|---|
| App | [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/) |
| Language | TypeScript |
| Navigation | [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing) |
| Graphics | react-native-svg (macro rings) |
| Design | Figma |
| Backend | [Supabase](https://supabase.com/): auth, Postgres database |
| AI | Anthropic Claude API for recipe parsing, USDA FoodData Central for nutrition data |

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (LTS version)
- The **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Run it locally

```bash
# 1. Clone the repo
git clone https://github.com/TiyaB-debug/MacroMate.git
cd MacroMate

# 2. Install dependencies
npm install

# 3. Start the app
npx expo start
```

Then scan the QR code with your phone's camera (iPhone) or the Expo Go app (Android). Press `w` in the terminal to open it in a web browser instead.

> **Tip:** If your phone can't connect (common on school Wi-Fi), run `npx expo start --tunnel`.

---

## 📁 Project Structure

```
src/
├── app/                    # Screens (each file is a route)
│   ├── (tabs)/             # Bottom tab bar: Home, Menu, Profile
│   ├── onboarding/         # Setup flow: basic info → goals → diet → allergies → targets
│   ├── recipe/[id].tsx     # Recipe details
│   ├── sign-in.tsx         # Sign up / log in
│   ├── add-meal.tsx        # Log food for a meal
│   ├── add-recipe.tsx      # Create or edit a recipe
│   ├── pantry.tsx          # Pantry tracker
│   └── create-from-pantry.tsx
├── components/             # Reusable UI (buttons, inputs, macro rings, cards)
├── state/                  # App data (profile, recipes, pantry, food log)
├── lib/                    # Helpers
└── theme.ts                # Colors, spacing, and typography from the Figma design
```

**Want to change the look?** Colors, spacing, and fonts all live in `src/theme.ts`.

---

##Roadmap

- [x] Figma design
- [x] All core screens built and working with sample data
- [ ] Connect Supabase for real accounts and saved data
- [ ] Automatic nutrition calculation from ingredient lists (Claude API + USDA)
- [ ] Import recipes from a link or photo
- [ ] Healthier ingredient swap suggestions
- [ ] Beta testing (TestFlight + Google Play)
- [ ] Launch on the App Store and Google Play

> **Note:** The app currently uses sample data stored in memory, so changes reset when the app closes. Persistent storage arrives with the Supabase integration.

---

## Contributing (for team members)

1. Pull the latest changes before you start: `git pull`
2. Create a branch for your feature: `git checkout -b feature/your-feature-name`
3. Commit your work and push the branch: `git push -u origin feature/your-feature-name`
4. Open a **Pull Request** on GitHub and ask a teammate to review it
5. Once approved, merge it into `main`

Keep `main` working at all times. Test your changes on a real phone before opening a PR.
