import { questionsContainer } from './dom.js';

export function displayQuestions(questions) {
  questionsContainer.innerHTML = '';

  questions.forEach((q, index) => {
    const questionDiv = document.createElement('fieldset');
    questionDiv.classList.add('question-block');
    questionDiv.setAttribute('role', 'group');
    questionDiv.setAttribute('aria-labelledby', `question-title-${index + 1}`);
    questionDiv.tabIndex = -1;

    const legend = document.createElement('legend');
    legend.id = `question-title-${index + 1}`;
    legend.textContent = `Question ${index + 1} :`;
    questionDiv.appendChild(legend);

    const aosEffect = index % 2 === 0 ? 'fade-right' : 'fade-left';
    questionDiv.setAttribute('data-aos', aosEffect);
    questionDiv.setAttribute('data-aos-duration', '600');

    const questionContent = document.createElement('div');
    questionContent.classList.add('question-content');

    if (q.enonceFormat && q.enonceFormat === 'markdown') {
      questionContent.innerHTML = marked.parse(q.enonce);
    } else {
      const questionText = document.createElement('p');
      questionText.textContent = q.enonce;
      questionContent.appendChild(questionText);
    }

    const markdownTables = questionContent.querySelectorAll('table');
    markdownTables.forEach((table, tableIndex) => {
      const containerId = `table-${q.questionId}-${tableIndex}`;
      const tableContainer = document.createElement('table');
      tableContainer.id = containerId;
      table.replaceWith(tableContainer);

      let headers = Array.from(table.querySelectorAll('th')).map((th) => th.textContent.trim().replace(/\n/g, ' '));
      if (headers.length === 0) {
        const firstRow = table.querySelector('tr');
        if (firstRow) {
          headers = Array.from(firstRow.querySelectorAll('td')).map((td) => td.textContent.trim().replace(/\n/g, ' '));
        }
      }

      const rows = [];
      let rowElements = table.querySelectorAll('tbody tr');
      if (rowElements.length === 0) {
        rowElements = table.querySelectorAll('tr:not(:first-child)');
      }
      rowElements.forEach((tr) => {
        const cells = Array.from(tr.querySelectorAll('td')).map((td) => td.textContent.trim().replace(/\n/g, ' ') || '');
        if (cells.some((cell) => cell !== '')) {
          const rowData = {};
          headers.forEach((header, headerIndex) => {
            rowData[header] = cells[headerIndex] || '';
          });
          rows.push(rowData);
        }
      });

      if (headers.length >= 2 && headers.length <= 4) {
        tableContainer.classList.add('fixed-columns', `fixed-columns-${headers.length}`);
      }

      if (headers.length > 0 && rows.length > 0) {
        try {
          new JSTable({
            table: `#${containerId}`,
            data: rows,
            columns: headers.map((header) => ({ name: header, title: header, width: 'auto' })),
            classes: ['table', 'table-bordered', 'table-hover'],
            search: false,
            pagination: false,
          });
        } catch (error) {
          console.error('Erreur JSTable :', error);
          tableContainer.outerHTML = table.outerHTML;
        }
      } else {
        tableContainer.outerHTML = table.outerHTML;
      }
    });

    questionDiv.appendChild(questionContent);

    q.choices.forEach((choiceText, choiceIndex) => {
      const label = document.createElement('label');
      label.classList.add('choice-label', 'd-block', 'mb-2');

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = `question-${q.questionId}`;
      radio.value = choiceIndex;
      radio.classList.add('me-2');
      radio.setAttribute('aria-describedby', `question-title-${index + 1}`);

      label.appendChild(radio);
      label.appendChild(document.createTextNode(choiceText));
      questionDiv.appendChild(label);
    });

    questionsContainer.appendChild(questionDiv);
  });

  if (window.AOS) {
    AOS.refresh();
  }
}
