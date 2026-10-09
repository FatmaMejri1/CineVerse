# 🎬 CineVerse

> A modern, full-featured movie discovery and social experience app built with **Ionic + Angular** and powered by **Firebase** and **TMDB API**.

---

## 📱 Overview

**CineVerse** is a cross-platform mobile/web application that lets users discover movies, manage personal watchlists and favorites, rate films, and find their perfect movie match with friends — all in a sleek, cinematic dark UI.

---

## ✨ Features

### 👤 User Features
- 🔐 **Authentication** — Register & login with Firebase Auth
- 🏠 **Home** — Trending, popular, and top-rated movies fetched from TMDB
- 🎥 **Movies** — Browse the full movie catalog (TMDB + admin-added movies)
- ❤️ **Favorites** — Save and manage favorite movies
- 📋 **Watchlist** — Keep track of movies you want to watch
- ⭐ **Ratings & Comments** — Rate movies and leave reviews
- 🎯 **Matching** — Find movies that match your taste with friends
- 👤 **Profile** — Manage personal info and preferences

### 🛡️ Admin Features
- 📊 **Dashboard** — Overview of platform statistics
- 🎬 **Movie Management** — Add, edit, and delete custom movies with poster URL support
- 👥 **User Management** — View, activate, and deactivate user accounts safely

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Ionic 9](https://ionicframework.com/) + [Angular 22](https://angular.io/) |
| Mobile Runtime | [Capacitor 8](https://capacitorjs.com/) |
| Backend / Auth | [Firebase](https://firebase.google.com/) (Auth, Firestore, Storage) |
| Movie Data | [TMDB API](https://www.themoviedb.org/documentation/api) |
| Icons | [Ionicons](https://ionic.io/ionicons) + [Bootstrap Icons](https://icons.getbootstrap.com/) |
| Styling | SCSS + CSS Variables |
| Language | TypeScript 6 |

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 9
- Ionic CLI: `npm install -g @ionic/cli`
- Firebase project configured

### Installation

```bash
# Clone the repository
git clone https://github.com/FatmaMejri1/CineVerse.git
cd CineVerse

# Install dependencies
npm install
```

### Environment Setup

Create a `src/environments/environment.ts` file with your Firebase and TMDB credentials:

```typescript
export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_AUTH_DOMAIN',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_STORAGE_BUCKET',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID'
  },
  tmdbApiKey: 'YOUR_TMDB_API_KEY'
};
```

### Running Locally

```bash
ionic serve
```

The app will be available at `http://localhost:8100`.

### Building for Production

```bash
ionic build --prod
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── guards/         # Auth & Admin route guards
│   │   └── services/       # Movie, Auth, Firestore services
│   ├── pages/
│   │   ├── home/           # Home page with trending/popular movies
│   │   ├── movies/         # Full movie catalog
│   │   ├── movie-details/  # Individual movie detail view
│   │   ├── favorites/      # User favorites
│   │   ├── watchlist/      # User watchlist
│   │   ├── matching/       # Movie matching feature
│   │   ├── profile/        # User profile
│   │   ├── login/          # Authentication
│   │   ├── register/       # Registration
│   │   └── admin/
│   │       ├── dashboard/  # Admin statistics
│   │       ├── movies/     # Movie CRUD management
│   │       └── users/      # User management
│   └── app.routes.ts       # Application routing
├── environments/           # Environment configs
└── global.scss             # Global styles
```

---

## 🔒 Firestore Security Rules

The app enforces role-based access control:
- **Public**: Read access to movies
- **Authenticated users**: Read/write own profile, favorites, watchlist, ratings
- **Admin role**: Full CRUD on movies and user management

---

## 📱 Mobile (Android)

```bash
# Add Android platform
ionic capacitor add android

# Build and sync
ionic capacitor build android

# Open in Android Studio
ionic capacitor open android
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 👩‍💻 Author

**Fatma Mejri** — [GitHub](https://github.com/FatmaMejri1)

---

## 📄 License

This project is private and all rights are reserved.
