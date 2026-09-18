# Pomiar 3D MVP 0.2

Offline-first PWA do terenowego zbierania geometrii pomieszczeń i innych obszarów z myślą o późniejszym imporcie do Blendera.

## Co jest w tej wersji

- projekt może zawierać wiele niezależnych obszarów: pomieszczenie, taras, klatkę schodową itd.,
- każdy obszar ma własne punkty, ściany/odcinki, przekroje, pomiary, sesje i historię,
- ekran projektu pokazuje stopień kompletności i liczbę braków każdego obszaru,
- można przerwać pomiar tarasu i wrócić później do poddasza bez utraty kontekstu,
- rzut z góry pokazuje elementy zmierzone / wyliczone / brakujące i linie przekrojów,
- przekroje A–A/B–B pokazują graficznie punkty i braki,
- szybkie pomiary ręczne oraz deterministyczne komendy tekstowe pod dyktowanie z klawiatury Androida,
- komendy względne MVP: `+x 4826`, `-x 1000`, `+y 3174`, `-y 500`,
- tap na ścianę/punkt/kształt na rzucie (w trybie Modyfikacja) zaznacza element i otwiera edycję,
- prowadzony formularz „+ Dodaj element" (punkt / ściana / prostokąt / koło) z podpowiadanym ID i zapamiętanym ostatnim typem,
- kształty rzutu (prostokąt, koło) z wysokością — słupki, otwory itp.,
- lokalny zapis IndexedDB i zapamiętanie aktywnego projektu,
- eksport/import `.pomiar3d` (JSON, mm), wraz z migracją wcześniejszego płaskiego MVP,
- PWA/offline i workflow GitHub Pages,
- neutralny interfejs `LaserAdapter` pod przyszłe dalmierze BLE,
- startowy dodatek Blendera w `blender_addon/`.

## Uruchomienie

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

Pierwsze `npm install` powinno utworzyć `package-lock.json`; warto go zatwierdzić w repo i później używać `npm ci`.

## Najważniejsze pliki

- `src/domain/model.ts` — kanoniczny model projektu,
- `src/domain/operations.ts` — bezpieczne aktualizacje obszarów + historia,
- `src/commands/parser.ts` — język szybkich komend,
- `src/io/projectFile.ts` — walidacja/migracja/eksport,
- `src/storage/db.ts` — IndexedDB,
- `docs/FORMAT.md` — kontrakt `.pomiar3d`,
- `blender_addon/pomiar3d_importer.py` — minimalny importer Blendera,
- `CLAUDE_CODE_HANDOFF.md` — konkretne zadanie do przekazania Claude Code.

## Uwaga o weryfikacji w tym pakiecie

Kod został sprawdzony statycznie pod kątem składni TypeScript/TSX (lokalny kompilator zgłaszał wyłącznie brak zainstalowanych modułów) oraz `py_compile` dla dodatku Blendera. W środowisku, w którym powstał pakiet, pobieranie zależności npm nie zakończyło się w dostępnym czasie, dlatego pełny `npm run build` ma wykonać Claude Code jako pierwszy krok.
