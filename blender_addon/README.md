# Blender addon — Pomiar 3D Importer

Minimalny importer MVP. Instaluje plik `pomiar3d_importer.py` jako dodatek Blendera.

Po aktywacji: **File → Import → Pomiar 3D (.pomiar3d)**.

Importer:
- przelicza mm → m,
- tworzy osobną kolekcję dla każdego obszaru,
- rozdziela ściany/odcinki na `EXISTING`, `RECONSTRUCTED`, `PROPOSED`,
- tworzy punkty referencyjne jako Empty,
- zachowuje identyfikatory i statusy jako custom properties obiektów.

To importer startowy. Nie tworzy jeszcze otworów, połaci z przekrojów ani aktualizacji/reimportu istniejącego modelu.
