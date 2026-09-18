# Pomiar 3D — handoff dla Claude Code

Masz repozytorium aplikacji terenowej **Pomiar 3D MVP 0.2**. Twoim zadaniem jest doprowadzić dostarczony kod do stanu uruchamialnego, sprawdzić go na realnym buildzie i wdrożyć do istniejącego repo/GitHub Pages. Nie zaczynaj projektu od nowa.

## Kontekst produktu

Aplikacja ma działać jako instalowalna PWA na Android/Chrome. Po pierwszym załadowaniu ma działać bez internetu. GitHub służy do kodu, publikacji i aktualizacji aplikacji. **Dane pomiarowe pozostają lokalnie na telefonie**, dopóki użytkownik jawnie nie wyeksportuje pliku `.pomiar3d`.

Użytkownik może mierzyć kilka rzeczy w ramach jednego projektu, np.:
- rano: pokój na poddaszu,
- później: niezależnie taras i istniejący szkielet barierek,
- następnego dnia: wrócić do poddasza i kontynuować dokładnie tam, gdzie skończył.

Model danych został już dostosowany: `Project -> Area -> Sessions / Geometry / Measurements / History`.

## Pierwsze zadanie — obowiązkowe

1. Przeczytaj `README.md`, `docs/FORMAT.md` i kod `src/domain/model.ts`.
2. Uruchom `npm install` (w paczce może nie być jeszcze `package-lock.json`).
3. Zatwierdź wygenerowany `package-lock.json`.
4. Uruchom `npm run build`.
5. Napraw wszystkie realne błędy TypeScript/runtime/PWA, ale **nie przebudowuj architektury bez potrzeby**.
6. Uruchom aplikację i sprawdź ręcznie szerokości ok. 360–430 px oraz desktop.
7. Zweryfikuj workflow GitHub Pages.
8. Dopiero po zielonym buildzie wykonuj dalsze ulepszenia.

## Definition of Done dla obecnej iteracji

### Projekt / obszary
- ekran projektu pokazuje co najmniej dwa obszary demo: `Pokój poddasze` i `Taras`,
- karta obszaru pokazuje kompletność, braki, liczbę pomiarów i ostatnią sesję,
- wejście do obszaru i powrót do listy nie gubi stanu,
- utworzenie nowego obszaru działa i zapisuje się offline.

### Sesje / historia
- każdy obszar ma własne sesje pomiarowe,
- nowy pomiar trafia do aktywnej sesji,
- można utworzyć nową sesję i ustawić ją jako aktywną,
- historia pokazuje dodawanie/poprawianie punktów, ścian, pomiarów i sesji,
- zmiana obszaru nie miesza historii ani pomiarów.

### Rzut / przekroje
- rzut pokazuje zmierzone / wyliczone / brakujące elementy,
- kliknięcie linii A–A/B–B przechodzi do właściwego przekroju,
- przekrój pokazuje `zmierzone/wszystkie` oraz listę braków,
- uzupełnienie brakującej wysokości aktualizuje przekrój i dopisuje historię.

### Offline / dane
- IndexedDB zachowuje projekt po odświeżeniu,
- importowany projekt pozostaje aktywny również po ponownym uruchomieniu aplikacji,
- eksport → import odtwarza wszystkie obszary, sesje, pomiary i historię,
- migracja starego płaskiego formatu MVP działa,
- po wcześniejszym załadowaniu aplikacji: rzut, przekroje, komendy, zapis i eksport działają bez sieci.

### Blender
- sprawdź składnię dodatku `blender_addon/pomiar3d_importer.py`,
- jeśli masz dostęp do Blendera: wykonaj import przykładowego `.pomiar3d`,
- nie rozbudowuj jeszcze importera ponad podstawowy import punktów i ścian, chyba że wymaga tego błąd.

## Kontrakty — nie łam bez wyraźnego powodu

- format pliku: `format: "pomiar3d"`, `version: 1`, `units: "mm"`,
- milimetr jest kanoniczną jednostką danych,
- surowe `Measurement` są osobne od bieżącej geometrii,
- poprawienie punktu/ściany nie kasuje wcześniejszych pomiarów,
- `Area` jest niezależnym fragmentem projektu,
- `MeasurementSession` opisuje konkretną wizytę/podejście pomiarowe,
- `state`: `existing | reconstructed | proposed`,
- `status`: `measured | derived | incomplete`,
- rdzeń aplikacji nie zależy od konkretnego producenta dalmierza,
- Bluetooth wyłącznie przez `LaserAdapter` i osobne adaptery urządzeń,
- ręczny pomiar musi zawsze działać bez BLE i bez internetu,
- „głos” w MVP = przede wszystkim dyktowanie do zwykłego inputa przez klawiaturę Androida; nie uzależniaj aplikacji od cloud SpeechRecognition.

## Aktualny minimalny język komend

Nie usuwaj:

```text
punkt P4 1200 800 0
P4 1200 800 0
ściana W05 P3 P4 2638 120
sciana W05 P3 P4 2638 120
pomiar P0 P2 5776
+x 4826
-x 1000
+y 3174
-y 500
```

Komendy mają być deterministyczne. Jeśli parser nie jest pewien — pokaż błąd, nie zgaduj.

## Priorytet UX

Aplikacja nie ma być CAD-em. W terenie ma natychmiast odpowiadać:

1. Co już zmierzyłem?
2. Czego jeszcze brakuje?
3. Którego miejsca dotyczy liczba?
4. W której sesji powstał pomiar?
5. Czy element jest istniejący, odtworzony czy projektowany?

Nie chowaj braków w tabelach. Pokazuj je również na grafice.

## Co zrobić po stabilizacji — osobne, małe commity

W tej kolejności:

1. Graficzne tworzenie i edycja punktów/ścian na rzucie.
2. Pełne undo/redo oparte o komendy/zdarzenia (obecna historia jest dziennikiem audytowym, nie pełnym event sourcingiem).
3. Tworzenie/edycja linii przekrojów z rzutu.
4. Raport „czego brakuje” dla całego obszaru.
5. Zdjęcia offline przypięte do punktu/ściany/przekroju.
6. Ulepszenie komend względnych (aktywna wysokość i grubość ściany, nazewnictwo punktów).
7. BLE dla konkretnego modelu dalmierza po udokumentowaniu GATT.
8. Reimport/synchronizacja w Blenderze po stabilnych `area.id + entity.id`.

## Zasady danych i prywatności

- nie dodawaj analytics/telemetrii,
- nie synchronizuj projektów do chmury automatycznie,
- nie publikuj plików pomiarowych w repo,
- nie dodawaj sekretów/API keys do frontendu,
- zawsze waliduj importowany plik przed zapisaniem,
- awaria migracji nie może usuwać starego rekordu z IndexedDB.

## Raport końcowy od Claude Code

Po pracy podaj:
- commity / pliki, które zmieniłeś,
- wynik `npm run build`,
- jak sprawdziłeś PWA/offline,
- czy import/export zachowuje obszary i sesje,
- ewentualne problemy na Chrome Android,
- maksymalnie 5 następnych kroków, bez przepisywania projektu od zera.
