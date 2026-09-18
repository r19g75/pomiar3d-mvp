# `.pomiar3d` — format MVP v1

Plik jest zwykłym JSON-em. Wszystkie długości są przechowywane w **milimetrach**.

## Hierarchia

```text
Project
└── Area[]
    ├── MeasurementSession[]
    ├── Point3D[]
    ├── Wall[]
    ├── Section[]
    ├── Measurement[]
    └── HistoryEntry[]
```

## Założenia

- `Measurement` to surowy fakt pomiarowy. Nie jest kasowany dlatego, że geometria została później poprawiona.
- `Point3D`, `Wall`, `Section` opisują aktualną interpretację geometrii.
- `sessionId` pozwala rozdzielić kolejne wizyty/podejścia pomiarowe w tym samym obszarze.
- `state` rozdziela stan istniejący (`existing`), odtworzony (`reconstructed`) i projektowany (`proposed`).
- `status` geometrii rozdziela element zmierzony (`measured`), wyliczony (`derived`) i niekompletny (`incomplete`).
- identyfikatory (`P1`, `W03`, `AA1`) są stabilnymi odwołaniami; UI może je zmienić dopiero po świadomej operacji migracji/rename.

## Minimalny przykład

```json
{
  "format": "pomiar3d",
  "version": 1,
  "id": "projekt_1",
  "name": "Dom",
  "units": "mm",
  "createdAt": "2026-09-18T08:00:00.000Z",
  "updatedAt": "2026-09-18T08:15:00.000Z",
  "activeAreaId": "A_ROOM",
  "areas": [
    {
      "id": "A_ROOM",
      "name": "Pokój poddasze",
      "kind": "room",
      "createdAt": "2026-09-18T08:00:00.000Z",
      "updatedAt": "2026-09-18T08:15:00.000Z",
      "activePointId": "P1",
      "activeSessionId": "S1",
      "points": [
        {"id":"P0","position":{"x":0,"y":0,"z":0},"source":"measured","state":"existing"},
        {"id":"P1","position":{"x":4826,"y":0,"z":0},"source":"measured","state":"existing"}
      ],
      "walls": [
        {"id":"W01","from":"P0","to":"P1","heightMm":2638,"thicknessMm":120,"status":"measured","state":"existing"}
      ],
      "sections": [],
      "measurements": [
        {"id":"M1","kind":"distance","from":"P0","to":"P1","valueMm":4826,"source":"manual","createdAt":"2026-09-18T08:05:00.000Z","sessionId":"S1"}
      ],
      "sessions": [
        {"id":"S1","name":"Pomiar początkowy","startedAt":"2026-09-18T08:00:00.000Z"}
      ],
      "history": []
    }
  ]
}
```

## Blender

Importer `blender_addon/pomiar3d_importer.py` przelicza `mm -> m` i tworzy kolekcje obszarów. Docelowo reimport powinien identyfikować obiekty po stabilnym `area.id + entity.id`, a nie po nazwie widocznej w UI.
