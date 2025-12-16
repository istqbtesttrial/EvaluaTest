# EvaluaTest

EvaluaTest est une application web de quiz pour s'entraîner à l'examen **ISTQB Foundation Level**. Les questions sont en français et couvrent l'ensemble des chapitres du syllabus.

## Comment utiliser l'application

### Pré-requis

- Un navigateur web récent (Chrome, Firefox, Edge...).
- Une connexion Internet active : certaines bibliothèques sont chargées depuis des CDN.
- Python 3 installé pour lancer un petit serveur local (aucune installation supplémentaire n'est nécessaire).

### Étapes rapides (moins de 2 minutes)

1. Ouvrez un terminal et placez-vous à la racine du projet.
2. Lancez un serveur HTTP local :

   ```bash
   python3 -m http.server 8000
   ```

3. Ouvrez votre navigateur et allez sur <http://localhost:8000/>.
4. La page `index.html` s'affiche : choisissez un chapitre, répondez aux questions, puis validez pour voir votre score.

> Astuce : gardez le terminal ouvert pendant l'utilisation. Pour arrêter le serveur, appuyez sur `Ctrl + C`.

## Comprendre les données de questions

Les questions sont organisées par chapitre dans des fichiers JSON. Chaque fichier `chaptX.json` suit la structure suivante :

```json
{
  "chapterId": 1,
  "title": "Chapitre 1",
  "enonceFormat": "markdown",
  "questions": [
    {
      "questionId": "1-1",
      "enonce": "...",
      "choices": ["A", "B", "C", "D"],
      "correctIndex": 0
    }
  ]
}
```

Un fichier consolidé `questions.json` regroupe tous les chapitres dans un tableau `chapters` avec le même format. Chaque question contient :

- `enonce` : l'énoncé de la question.
- `choices` : les propositions de réponse.
- `correctIndex` : l'indice (0, 1, 2, 3...) de la bonne réponse dans le tableau `choices`.

## Conseils pour vos sessions d'entraînement

- Travaillez chapitre par chapitre pour consolider vos connaissances ISTQB.
- Relisez les questions auxquelles vous avez répondu incorrectement pour comprendre les pièges classiques.
- Variez l'ordre des chapitres et des questions pour éviter l'effet mémoire.
