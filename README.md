# A.R.I — Persönlicher KI-Assistent

A.R.I läuft als Command Center auf dem PC und als eigenständige App auf dem Handy. Beide synchronisieren sich automatisch (Gehirn, Einstellungen, KI-Schlüssel).

## 🖥️ Für den PC

1. **[ari-pc-setup.zip herunterladen](https://kingshadow1332.github.io/A.R.I/app/pc/ari-pc-setup.zip)**
2. Entpacken (z. B. auf den Desktop)
3. **`ARI-Setup.exe` doppelklicken** und „Installieren“ wählen — richtet Python & alle Pakete automatisch ein

A.R.I sucht beim Start selbst nach neueren Versionen und bietet ein Update per Klick an — nichts hier manuell nachziehen.

## 🐧 Für Linux (Ubuntu/Debian, X11) — ⚠️ ungetestet

1. **[ari-linux.zip herunterladen](https://kingshadow1332.github.io/A.R.I/app/pc/ari-linux.zip)** und entpacken
2. Im Terminal im entpackten Ordner: `bash linux/install.sh`
3. Fertig — „A.R.I Assistant“ steht im Programmmenü (und optional auf dem Desktop, mit Icon)

Die Linux-Version wurde noch nicht auf echtem Linux getestet und kann Fehler enthalten. Der Installer richtet Python-Umgebung, benötigte Pakete (xdotool, wmctrl, playerctl …), Starter und auf Wunsch Autostart ein. Optionen: `--with-piper` (lokale Stimme), `--autostart`, `--dir`, `--uninstall`.
Unter **Wayland** sind Tasten-/Maussteuerung und Bildschirm-Ansicht eingeschränkt — beim Login „Ubuntu on Xorg“ wählen.

## 📱 Fürs Handy (Android)

1. **[ARI.apk herunterladen](https://kingshadow1332.github.io/A.R.I/app/ARI.apk)**
2. Datei öffnen und installieren (Android fragt einmal nach Erlaubnis für „Unbekannte Apps“ bzw. blockiert es kurz über den Play-Protect-Schutz — dort „Trotzdem installieren“ wählen)
3. App öffnen, mit dem PC koppeln (QR-Code am PC unter Einstellungen → HANDY)

Die App läuft auch **ohne PC** eigenständig (eigener KI-Schlüssel in den Einstellungen).

## Aktueller Stand

| | Version | Download |
|---|---|---|
| PC (Windows) | 1.6.35 | [ari-pc-setup.zip](https://kingshadow1332.github.io/A.R.I/app/pc/ari-pc-setup.zip) |
| PC (Linux) | 1.6.35 | [ari-linux.zip](https://kingshadow1332.github.io/A.R.I/app/pc/ari-linux.zip) |
| Handy | 1.58 | [ARI.apk](https://kingshadow1332.github.io/A.R.I/app/ARI.apk) |

Beide Programme aktualisieren sich danach selbst über diese Seite.

## ☕ Unterstützen

A.R.I ist kostenlos und bleibt es. Wenn du die Weiterentwicklung unterstützen möchtest — z. B. die Veröffentlichung in den App-Stores (Google Play, evtl. Apple) oder einfach die Zeit, die reingeht — freue ich mich über jede Spende:

**[paypal.me/KingSadow](https://paypal.me/KingSadow)**
