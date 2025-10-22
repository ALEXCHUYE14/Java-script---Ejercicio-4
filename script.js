// --- CONFIGURACIÓN E INICIALIZACIÓN DE DATOS ---
const GRID_SIZE = 15;
const JS_WORDS = [
    "FUNCTION", "VARIABLE", "ARRAY", "OBJECT", "CONST",
    "LET", "PROMISE", "ASYNC", "AWAIT", "SCOPE",
    "CLOSURE", "DOM", "HOISTING", "CALLBACK", "PROTOTYPE"
];
// DIRECTIONS ya no se usa para la interacción, pero se mantiene para la generación del tablero.
const DIRECTIONS = [
    { dr: 0, dc: 1 }, { dr: 0, dc: -1 }, { dr: 1, dc: 0 }, { dr: -1, dc: 0 },
    { dr: 1, dc: 1 }, { dr: 1, dc: -1 }, { dr: -1, dc: 1 }, { dr: -1, dc: -1 }
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
    // wordLocations es CRUCIAL para saber qué celdas marcar en verde.
    let wordLocations = {}; 
    let currentSelection = []; // Lista de celdas DOM seleccionadas
    let timerInterval = null;
    let timeElapsed = 0;


    // -------------------------------------------------------------------
    // --- LÓGICA DE JUEGO Y GENERACIÓN ---
    // -------------------------------------------------------------------

    function initGame() {
        resetState();
        generateEmptyGrid();
        placeWordsInGrid(); // Coloca las palabras y llena wordLocations
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
            let attempts = 500;
            
            while (!placed && attempts > 0) {
                attempts--;
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
                    wordLocations[word] = currentWordCells; // 🔑 GUARDA LA UBICACIÓN ORIGINAL
                    placed = true;
                }
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
        wordListDiv.innerHTML = '<h2>Palabras</h2>';
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
        clearSelection();
        wordLocations = {};
        currentSelection = [];
        
        document.querySelectorAll('.found-word').forEach(el => el.classList.remove('found-word'));
        document.querySelectorAll('.found').forEach(el => el.classList.remove('found'));
    }


    // -------------------------------------------------------------------
    // --- NUEVA INTERACCIÓN: CLIC INDIVIDUAL (FUNCIÓN CENTRAL) ---
    // -------------------------------------------------------------------

    function addInteractionListeners() {
        const cells = gridContainer.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.addEventListener('click', handleCellClick);
        });
    }

    function handleCellClick(e) {
        const cell = e.target;
        // Ignorar si no es una celda o si ya ha sido encontrada
        if (!cell.classList.contains('grid-cell') || cell.classList.contains('found')) return;

        // Si la celda ya está seleccionada, la deseleccionamos
        if (cell.classList.contains('selected')) {
            cell.classList.remove('selected');
            const index = currentSelection.indexOf(cell);
            if (index > -1) {
                currentSelection.splice(index, 1);
            }
            return;
        }
        
        // Evitar selecciones demasiado largas que nunca serán palabras
        if (currentSelection.length >= 15) {
             clearSelection();
        }

        // Si la celda es nueva, la seleccionamos
        cell.classList.add('selected');
        currentSelection.push(cell);

        // Comprobar si la nueva selección forma una palabra
        checkSelection();
    }

    /**
     * Comprueba si las letras seleccionadas forman una palabra a encontrar.
     */
    function checkSelection() {
        if (currentSelection.length === 0) return;

        // 1. Obtener la secuencia de letras seleccionadas (en el orden de selección)
        let selectedWord = '';
        currentSelection.forEach(cell => {
            selectedWord += cell.textContent;
        });

        // 2. Comprobar coincidencias (palabra normal y palabra inversa)
        const possibleWords = [selectedWord, selectedWord.split('').reverse().join('')];
        
        let foundWordText = null;

        for (const word of possibleWords) {
            if (wordsToFind.includes(word) && !foundWords.includes(word)) {
                foundWordText = word;
                break;
            }
        }

        // 3. Si encontramos una palabra, la marcamos
        if (foundWordText) {
            markAsFound(foundWordText);
            
            // Buscamos la ubicación en nuestro mapa wordLocations para el marcado visual
            const cellsToMark = wordLocations[foundWordText];
            
            if (cellsToMark) {
                 // Usamos las coordenadas guardadas para marcar la palabra correctamente
                 markCellsAsFound(cellsToMark);
            } else {
                 // Respaldo (usa las celdas DOM seleccionadas)
                 markCellsAsFoundByElement(currentSelection);
            }

            // Después de encontrar, limpiamos la selección temporal
            clearSelection();
        }
        // Si no se encuentra, la selección temporal (morada) se mantiene para que el usuario añada más letras.
    }

    /**
     * Marca las celdas correspondientes a una palabra como 'found' usando las coordenadas.
     */
    function markCellsAsFound(cells) {
        cells.forEach(({ r, c }) => {
            const cell = document.querySelector(`[data-row="${r}"][data-col="${c}"]`);
            if (cell) {
                cell.classList.remove('selected');
                cell.classList.add('found');
            }
        });
    }

    /**
     * Marca las celdas correspondientes a una palabra como 'found' usando los elementos DOM.
     * (Solo usado como respaldo o si se quiere marcar la selección exacta del usuario)
     */
    function markCellsAsFoundByElement(cells) {
        cells.forEach(cell => {
            cell.classList.remove('selected');
            cell.classList.add('found');
        });
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
    
    /**
     * Limpia la selección temporal (las celdas moradas)
     */
    function clearSelection() {
        currentSelection.forEach(cell => {
             cell.classList.remove('selected');
        });
        currentSelection = [];
    }


    // --- ENLACE DE EVENTOS E INICIO ---
    newGameBtn.addEventListener('click', initGame);
    initGame();
});