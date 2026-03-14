# EvaluaTest

EvaluaTest est une application web de simulation pour s'entraîner à l'examen **ISTQB Foundation Level** dans des conditions proches du passage officiel.

L'objectif principal du projet est de proposer une **expérience d'examen blanc réaliste** :
- répartition fixe des questions inspirée du format officiel,
- timer,
- progression,
- correction détaillée après soumission,
- interface simple et centrée sur le passage de test.

## Fonctionnalités actuelles

- Écran de connexion avant accès au test
- Session avec option **Rester connecté**
- Bouton **Se déconnecter**
- Démarrage d'un examen blanc complet
- Timer d'examen
- Barre de progression
- Résumé avant validation
- Résultats détaillés avec :
  - score,
  - temps utilisé,
  - bonnes / mauvaises / non-répondues,
  - filtre de correction,
  - conseils de relecture
- Tableau de bord utilisateur avec :
  - dernier score,
  - meilleur score,
  - nombre de tentatives,
  - temps moyen,
  - historique récent

## Comment utiliser l'application

### Pré-requis

- Un navigateur web récent (Chrome, Firefox, Edge...)
- Une connexion Internet active : certaines bibliothèques sont chargées depuis des CDN
- Python 3 installé pour lancer un serveur HTTP local

### Lancement local

1. Ouvrez un terminal et placez-vous à la racine du projet.
2. Lancez un serveur HTTP local :

   ```bash
   python3 -m http.server 8000
   ```

3. Ouvrez votre navigateur et allez sur <http://localhost:8000/>.
4. Connectez-vous avec les identifiants configurés dans le projet.
5. Lancez l'examen, répondez aux questions, puis validez pour voir les résultats.

> Astuce : gardez le terminal ouvert pendant l'utilisation. Pour arrêter le serveur, appuyez sur `Ctrl + C`.

## Structure des données de questions

Les questions utilisées pour la simulation sont organisées par chapitre dans les fichiers :

- `chapt1.json`
- `chapt2.json`
- `chapt3.json`
- `chapt4.json`
- `chapt5.json`
- `chapt6.json`

Chaque fichier `chaptX.json` suit une structure de ce type :

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

Chaque question contient :
- `enonce` : l'énoncé de la question
- `choices` : les propositions de réponse
- `correctIndex` : l'indice de la bonne réponse dans le tableau `choices`

### Note importante

Le fichier `questions.json` est un **ancien fichier de test** conservé à titre historique.
Il **n'est pas la source active utilisée par l'application** pour construire la simulation actuelle.

## Philosophie du projet

EvaluaTest privilégie la **fidélité à l'examen officiel** plutôt qu'un mode libre par chapitre dans le parcours principal.
L'idée est de préparer les élèves à une expérience proche des vraies conditions de passage.

## Déploiement

Le projet peut être servi localement ou publié via **GitHub Pages**.

## Pistes d'amélioration techniques

- ajouter de vrais tests automatisés
- clarifier davantage la structure des données
- découper progressivement le JavaScript principal pour faciliter la maintenance
