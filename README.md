# EvaluaTest

EvaluaTest is a small web application providing practice quizzes for the ISTQB Foundation Level exam. Questions are stored in JSON files and loaded dynamically in the browser.

## Launching the quiz locally

Because the application fetches JSON files with `fetch`, it should be served over HTTP. A quick way to launch it is to use Python's built‑in web server:

```bash
python3 -m http.server 8000
```

Run this command from the project root and then open <http://localhost:8000/> in your browser. The `index.html` file will load and the quiz interface will appear.

## JSON data format

Questions are organized per chapter. Each `chaptX.json` file contains a structure similar to:

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

A consolidated `questions.json` is also provided where questions are grouped under a `chapters` array using a similar format. Each question object includes the statement (`enonce`), available `choices`, and the `correctIndex` of the right answer.
