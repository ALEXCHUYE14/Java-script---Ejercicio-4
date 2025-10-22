// --- CONFIGURACIÓN E INICIALIZACIÓN DE DATOS ---
const GRID_SIZE = 15;
const JS_WORDS = [
    "FUNCTION", "VARIABLE", "ARRAY", "OBJECT", "CONST",
    "LET", "PROMISE", "ASYNC", "AWAIT", "SCOPE",
    "CLOSURE", "DOM", "HOISTING", "CALLBACK", "PROTOTYPE"
];
const DIRECTIONS = [
    { dr: 0, dc: 1 },  // Horizontal derecha
    { dr: 0, dc: -1 }, // Horizontal izquierda
    { dr: 1, dc: 0 },  // Vertical abajo
    { dr: -1, dc: 0 }, // Vertical arriba
    { dr: 1, dc: 1 },  // Diagonal abajo-derecha
    { dr: 1, dc: -1 }, // Diagonal abajo-izquierda
    { dr: -1, dc: 1 }, // Diagonal arriba-derecha
    { dr: -1, dc: -1 } // Diagonal arriba-izquierda
];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';


// Inicia el código principal cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {

    // --- REFERENCIAS DOM ---
    const gridContainer = document.getElementById('word-search-grid');
    const wordListDiv = document.getElementById('word-list');
    const timerElement = document.getElementById('timer');
    const foundCountElement = document.getElementById('found-count');
    const newGameBtn = document.getElementById('new-game-btn');

    // --- ESTADO DEL JUEGO ---
    let gameGrid = [];
    let wordsToFind = [...JS_WORDS];
    let foundWords = [];
    let wordLocations = {}; // Almacena coordenadas de palabras { "WORD": [{r,c}, ...] }
    let isDrawing = false;
    let selectionStartCell = null;
    let selectionEndCell = null;
    let currentSelection = []; // Celdas actualmente resaltadas con 'selected'
    let timerInterval = null;
    let timeElapsed = 0;


    // -------------------------------------------------------------------
    // --- LÓGICA DE JUEGO Y GENERACIÓN ---
    // -------------------------------------------------------------------

    function initGame() {
        resetState();
        generateEmptyGrid();
        placeWordsInGrid();
        fillEmptyCells();
        drawGrid();
        drawWordList();
        startTimer();
    }

    function generateEmptyGrid() {
        gameGrid = [];
        for (let i = 0; i < GRID_SIZE; i++) {
            gameGrid.push(new Array(GRID_SIZE).fill(''));
        }
        gridContainer.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
    }

    function placeWordsInGrid() {
        wordLocations = {};
        const shuffledWords = [...JS_WORDS].sort(() => Math.random() - 0.5);

        shuffledWords.forEach(word => {
            let placed = false;
            let attempts = 0;
            const maxAttempts = 500;

            while (!placed && attempts < maxAttempts) {
                attempts++;
                const startRow = Math.floor(Math.random() * GRID_SIZE);
                const startCol = Math.floor(Math.random() * GRID_SIZE);
                const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];

                const { dr, dc } = direction;
                const wordLength = word.length;

                let canPlace = true;
                let currentWordCells = [];

                for (let i = 0; i < wordLength; i++) {
                    const r = startRow + i * dr;
                    const c = startCol + i * dc;

                    if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
                        canPlace = false;
                        break;
                    }

                    if (gameGrid[r][c] !== '' && gameGrid[r][c] !== word[i]) {
                        canPlace = false;
                        break;
                    }
                    currentWordCells.push({ r, c });
                }

                if (canPlace) {
                    for (let i = 0; i < wordLength; i++) {
                        const r = startRow + i * dr;
                        const c = startCol + i * dc;
                        gameGrid[r][c] = word[i];
                    }
                    wordLocations[word] = currentWordCells;
                    placed = true;
                }
            }
            if (!placed) {
                console.warn(`No se pudo colocar la palabra: ${word}`);
            }
        });
    }

    function fillEmptyCells() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (gameGrid[r][c] === '') {
                    const randomLetter = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
                    gameGrid[r][c] = randomLetter;
                }
            }
        }
    }

    function drawGrid() {
        gridContainer.innerHTML = '';
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.textContent = gameGrid[r][c];
                gridContainer.appendChild(cell);
            }
        }
        addInteractionListeners();
    }

    function drawWordList() {
        wordListDiv.innerHTML = '<h2>Palabras JS</h2>';
        wordsToFind.forEach(word => {
            const item = document.createElement('div');
            item.classList.add('word-item');
            item.id = `word-${word}`;
            item.textContent = word;
            wordListDiv.appendChild(item);
        });
    }

    function startTimer() {
        timeElapsed = 0;
        clearInterval(timerInterval);

        timerInterval = setInterval(() => {
            timeElapsed++;
            const minutes = String(Math.floor(timeElapsed / 60)).padStart(2, '0');
            const seconds = String(timeElapsed % 60).padStart(2, '0');
            timerElement.textContent = `${minutes}:${seconds}`;
        }, 1000);
    }

    function resetState() {
        clearInterval(timerInterval);
        foundWords = [];
        wordsToFind = [...JS_WORDS];
        foundCountElement.textContent = foundWords.length;
        timerElement.textContent = "00:00";
        clearSelection(false);
        wordLocations = {};
        currentSelection = [];
        selectionStartCell = null;
        selectionEndCell = null;
        // Limpiar estilos de encontrado
        document.querySelectorAll('.found-word').forEach(el => el.classList.remove('found-word'));
        document.querySelectorAll('.found').forEach(el => el.classList.remove('found'));
    }


    // -------------------------------------------------------------------
    // --- INTERACCIÓN Y MANEJO DE EVENTOS ---
    // -------------------------------------------------------------------

    function addInteractionListeners() {
        const cells = gridContainer.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.addEventListener('mousedown', handleMouseDown);
            cell.addEventListener('mouseenter', handleMouseEnter);
            cell.addEventListener('mouseup', handleMouseUp);
        });
    }

    function handleMouseDown(e) {
        if (e.target.classList.contains('grid-cell') && !e.target.classList.contains('found')) {
            isDrawing = true;
            selectionStartCell = e.target;
            selectionEndCell = e.target;
            currentSelection = [selectionStartCell];
            clearSelection();
            selectionStartCell.classList.add('selected');
        }
    }

    function handleMouseEnter(e) {
        if (isDrawing && e.target.classList.contains('grid-cell') && !e.target.classList.contains('found')) {
            selectionEndCell = e.target;
            highlightSelection(selectionStartCell, selectionEndCell);
        }
    }

    function handleMouseUp(e) {
        if (isDrawing) {
            isDrawing = false;
            const foundWordText = checkWord(selectionStartCell, selectionEndCell);

            if (foundWordText && !foundWords.includes(foundWordText)) {
                markAsFound(foundWordText);
                clearSelection(true); // Se encontró, no limpiamos inmediatamente
                markCellsAsFound(wordLocations[foundWordText]);
            } else {
                // Si no se encontró, limpiar la selección después de un breve retraso
                setTimeout(clearSelection, 300);
            }
        }
    }

    /**
     * Resalta visualmente las celdas en línea recta.
     */
    function highlightSelection(startCell, endCell) {
        const startR = parseInt(startCell.dataset.row);
        const startC = parseInt(startCell.dataset.col);
        const endR = parseInt(endCell.dataset.row);
        const endC = parseInt(endCell.dataset.col);

        currentSelection.forEach(cell => cell.classList.remove('selected'));
        currentSelection = [];

        const dr = endR === startR ? 0 : (endR > startR ? 1 : -1);
        const dc = endC === startC ? 0 : (endC > startC ? 1 : -1);

        // Si no es una línea recta (o solo es una celda)
        if (!(dr === 0 || dc === 0 || Math.abs(endR - startR) === Math.abs(endC - startC))) {
            // Solo resaltamos el punto de inicio
            startCell.classList.add('selected');
            currentSelection = [startCell];
            return;
        }

        let r = startR;
        let c = startC;
        while (true) {
            const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                cell.classList.add('selected');
                currentSelection.push(cell);
            }

            if (r === endR && c === endC) break;

            r += dr;
            c += dc;
        }
    }

    /**
     * Verifica si la selección de celdas forma una palabra válida.
     */
    function checkWord(startCell, endCell) {
        if (!startCell || !endCell) return null;

        const startR = parseInt(startCell.dataset.row);
        const startC = parseInt(startCell.dataset.col);
        const endR = parseInt(endCell.dataset.row);
        const endC = parseInt(endCell.dataset.col);

        const dr = endR === startR ? 0 : (endR > startR ? 1 : -1);
        const dc = endC === startC ? 0 : (endC > startC ? 1 : -1);

        if (!(dr === 0 || dc === 0 || Math.abs(endR - startR) === Math.abs(endC - startC))) {
            return null;
        }

        let selectedWord = '';
        let currentPathCells = [];
        let r = startR;
        let c = startC;

        while (true) {
            selectedWord += gameGrid[r][c];
            currentPathCells.push({ r, c });

            if (r === endR && c === endC) break;

            r += dr;
            c += dc;

            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
                return null;
            }
        }

        // 1. Comprobar la palabra en la dirección de la selección
        if (wordsToFind.includes(selectedWord) && !foundWords.includes(selectedWord)) {
            return selectedWord;
        }

        // 2. Comprobar la palabra en dirección inversa
        const reversedWord = selectedWord.split('').reverse().join('');
        if (wordsToFind.includes(reversedWord) && !foundWords.includes(reversedWord)) {
            // Si se encontró al revés, guardamos su ubicación invertida
            if(!wordLocations[reversedWord]) {
                 wordLocations[reversedWord] = currentPathCells.reverse();
            }
            return reversedWord;
        }

        return null;
    }

    function markAsFound(word) {
        foundWords.push(word);
        foundCountElement.textContent = foundWords.length;
        document.getElementById(`word-${word}`).classList.add('found-word');

        if (foundWords.length === JS_WORDS.length) {
            alert(`¡Felicidades! Completaste el pupiletras en ${timerElement.textContent}`);
            clearInterval(timerInterval);
        }
    }

    function markCellsAsFound(cells) {
        cells.forEach(({ r, c }) => {
            const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                cell.classList.remove('selected');
                cell.classList.add('found');
            }
        });
    }

    function clearSelection(keepFound = false) {
        currentSelection.forEach(cell => {
            if (!keepFound || !cell.classList.contains('found')) {
                cell.classList.remove('selected');
            }
        });
        currentSelection = [];
        selectionStartCell = null;
        selectionEndCell = null;
    }


    // --- ENLACE DE EVENTOS E INICIO ---
    newGameBtn.addEventListener('click', initGame);
    initGame();
});