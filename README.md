# Team Registration App

Eine vollständige React-Anwendung für die Registrierung von Teams mit Google OAuth und Supabase Backend.

## Features

- 🔐 **Google OAuth Authentifizierung**
- 📅 **Event-Management** - Events erstellen und verwalten
- 👥 **Team-Registrierung** - Teams mit genau 4 Mitgliedern
- 🎯 **Automatische 4-stellige Team-Codes**
- 🗄️ **PostgreSQL Datenbank** - Persistente Datenspeicherung
- 🔒 **Row Level Security** - Sichere Datenzugriffe
- 📱 **Responsive Design** - Funktioniert auf allen Geräten

## Quick Start

### 1. Dependencies installieren
```bash
npm install
```

### 2. App starten
```bash
npm start
```

### 3. Für Produktion builden
```bash
npm run build
```

## Deployment auf Vercel

### Automatisches Deployment:
1. Repository mit GitHub verbinden
2. Auf [vercel.com](https://vercel.com) einloggen
3. "New Project" → GitHub Repository auswählen
4. Deploy klicken ✨

### Manual Deployment:
```bash
npm run build
npx vercel --prod
```

## Supabase Konfiguration

Die App ist bereits für folgendes Supabase-Projekt konfiguriert:
- **URL:** `https://ciweenyyydsfpkmnuszk.supabase.co`
- **Google OAuth:** ✅ Aktiviert
- **Datenbank Schema:** ✅ Erstellt

### Tabellen:
- `profiles` - Benutzerprofile
- `events` - Events mit Metadaten
- `teams` - Teams mit Captain-Zuordnung
- `team_members` - Teammitglieder (4 pro Team)

## Verwendung

1. **Anmelden:** Mit Google-Konto anmelden
2. **Event erstellen:** Neue Events mit Datum und max. Teams
3. **Team anmelden:** Teams mit 4 Mitgliedern registrieren
4. **Verwalten:** Teams bearbeiten und löschen (nur Captain)

## Technologie Stack

- **Frontend:** React 18 + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth)
- **Icons:** Lucide React
- **Deployment:** Vercel/Netlify ready

## Support

Bei Fragen zur App oder zum Deployment, kontaktieren Sie den Entwickler.

---

**🚀 Live-Demo:** Nach dem Deployment verfügbar unter Ihrer Vercel/Netlify URL