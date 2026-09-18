# Blender addon — Pomiar 3D Importer

Minimalny importer MVP. Instaluje plik `pomiar3d_importer.py` jako dodatek Blendera.

Po aktywacji: **File → Import → Pomiar 3D (.pomiar3d)**.

Importer:
- przelicza mm → m,
- tworzy osobną kolekcję dla każdego obszaru,
- rozdziela ściany/odcinki na `EXISTING`, `RECONSTRUCTED`, `PROPOSED`,
- tworzy punkty referencyjne jako Empty,
- zachowuje identyfikatory i statusy jako custom properties obiektów,
- **P0→P1 jest licem pomiarowym ściany** — grubość odkłada się na jedną stronę wg `wall.thicknessSide` (`1`/`-1`, domyślnie `1`), nie symetrycznie wokół linii; strona zapisana jako `pomiar3d_thickness_side`,
- gdy `thicknessMm <= 0` (grubość nieznana), nie tworzy sztucznej 10 mm bryły — importuje referencyjną linię (edge) z property `pomiar3d_thickness_unknown = true`.

To importer startowy. Nie tworzy jeszcze otworów, połaci z przekrojów ani aktualizacji/reimportu istniejącego modelu.
