# Chiku Study Real MVP — Windows-friendly

This version avoids native `better-sqlite3`, so Node.js 24 on Windows does not require Visual Studio C++ Build Tools.

Run in PowerShell from this folder:

```powershell
npm.cmd install
npm.cmd start
```

Then open http://localhost:3000

Data is stored locally in `data.json`. This is suitable for the first local MVP; for public production, migrate to PostgreSQL and add production security controls.
