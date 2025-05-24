# EvaluaTest

EvaluaTest est une petite application web proposant des quiz d'entraînement pour l'examen ISTQB Foundation Level. Les questions sont stockées dans des fichiers JSON et chargées dynamiquement dans le navigateur.

## Lancer le quiz en local

Comme l'application récupère les fichiers JSON avec `fetch`, elle doit être servie via HTTP. Une méthode rapide consiste à utiliser le serveur web intégré de Python :

```bash
python3 -m http.server 8000
```

Exécutez cette commande depuis la racine du projet puis ouvrez <http://localhost:8000/> dans votre navigateur. Le fichier `index.html` se chargera et l'interface du quiz apparaîtra.

Cette version charge des bibliothèques externes depuis des CDN publics. Une connexion Internet active est donc nécessaire pendant l'utilisation de l'application.

## Format des données JSON

Les questions sont organisées par chapitre. Chaque fichier `chaptX.json` contient une structure similaire à :

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

Un fichier consolidé `questions.json` est également fourni où les questions sont regroupées dans un tableau `chapters` suivant le même format. Chaque objet question contient l'énoncé (`enonce`), les choix disponibles (`choices`) et l'indice (`correctIndex`) de la bonne réponse.
