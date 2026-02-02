// ============================================
// ИГРА "МОЗАИКА ВЕЛИКИХ КАРТИН"
// ============================================
// Основная логика игры.
// Данные (элементы и рецепты) находятся в файле data.js
// ============================================

// Состояние игры
let gameState = {
    unlockedElements: [],
    createdPaintings: [],
    slot1: null,
    slot2: null,
    // Для мобильного режима "два тапа"
    selectedElement: null
};

// Определение мобильного/тач-устройства (для отключения drag и показа подсказки)
function isMobileOrTouch() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(max-width: 480px)').matches;
}

function dismissMobileTapHint() {
    const hint = document.getElementById('mobile-tap-hint');
    if (hint && !hint.classList.contains('dismissed')) {
        hint.classList.add('dismissed');
    }
}

// ============================================
// МОБИЛЬНЫЙ РЕЖИМ "ДВА ТАПА"
// ============================================

// Показать индикатор выбранного элемента
function showSelectionBar(element) {
    const bar = document.getElementById('mobile-selection-bar');
    const elementSpan = document.getElementById('selection-element');
    if (bar && elementSpan) {
        elementSpan.textContent = `${element.icon} ${element.name}`;
        bar.classList.add('visible');
    }
}

// Скрыть индикатор
function hideSelectionBar() {
    const bar = document.getElementById('mobile-selection-bar');
    if (bar) {
        bar.classList.remove('visible');
    }
}

// Сбросить выбор элемента
function clearSelection() {
    gameState.selectedElement = null;
    hideSelectionBar();
    // Убрать подсветку со всех элементов
    document.querySelectorAll('.element.selected').forEach(el => {
        el.classList.remove('selected');
    });
}

// Подсветить выбранный элемент в сетке
function highlightSelectedElement(elementId) {
    // Сначала убрать подсветку со всех
    document.querySelectorAll('.element.selected').forEach(el => {
        el.classList.remove('selected');
    });
    // Подсветить нужный
    const elementDiv = document.querySelector(`.element[data-element-id="${elementId}"]`);
    if (elementDiv) {
        elementDiv.classList.add('selected');
    }
}

// Попытка создать комбинацию (для режима "два тапа")
function tryMobileCombine(element1, element2) {
    const elements = [element1.id, element2.id].sort();
    
    // Поиск рецепта
    const recipe = recipes.find(r => {
        const recipeElements = [...r.elements].sort();
        return recipeElements[0] === elements[0] && recipeElements[1] === elements[1];
    });

    if (recipe) {
        if (gameState.createdPaintings.includes(recipe.id)) {
            showMobileMessage('Вы уже создали эту картину!');
        } else {
            createPainting(recipe);
        }
    } else {
        showMobileNoRecipeMessage(element1, element2);
    }
    
    // Сбросить выбор после попытки
    clearSelection();
}

// Показать сообщение на мобильном (toast-стиль)
function showMobileMessage(text) {
    // Удалить предыдущее сообщение если есть
    const existing = document.querySelector('.mobile-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'mobile-toast';
    toast.textContent = text;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Сообщение "нет рецепта" на мобильном
function showMobileNoRecipeMessage(el1, el2) {
    // Сохраняем элементы для возможного предложения
    gameState.slot1 = el1;
    gameState.slot2 = el2;
    
    const existing = document.querySelector('.mobile-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'mobile-toast mobile-toast-with-action';
    toast.innerHTML = `
        <span>Комбинация не найдена</span>
        <div class="toast-buttons">
            <button class="toast-continue-btn">Продолжить</button>
            <button class="toast-suggest-btn">Предложить</button>
        </div>
    `;
    document.body.appendChild(toast);
    
    toast.querySelector('.toast-continue-btn').addEventListener('click', () => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    });
    
    toast.querySelector('.toast-suggest-btn').addEventListener('click', () => {
        toast.remove();
        showSuggestModal();
    });
    
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

// Инициализация базовых элементов
function initBaseElements() {
    // Добавляем флаг isBase к базовым элементам
    return baseElements.map(el => ({ ...el, isBase: true }));
}

// Загрузка сохранённого состояния
function loadGameState() {
    const saved = localStorage.getItem('mosaicGameState');
    if (saved) {
        const parsed = JSON.parse(saved);
        gameState = {
            ...gameState,
            ...parsed,
            slot1: null,
            slot2: null
        };
    } else {
        // Новая игра — только базовые элементы
        gameState.unlockedElements = initBaseElements();
    }
}

// Сохранение состояния
function saveGameState() {
    const toSave = {
        unlockedElements: gameState.unlockedElements,
        createdPaintings: gameState.createdPaintings
    };
    localStorage.setItem('mosaicGameState', JSON.stringify(toSave));
}

// Инициализация игры
function initGame() {
    loadGameState();
    
    // Если элементов нет — инициализируем базовые
    if (gameState.unlockedElements.length === 0) {
        gameState.unlockedElements = initBaseElements();
    }
    
    renderElements();
    renderGallery();
    updateStats();
    setupEventListeners();
}

// Рендеринг элементов
function renderElements() {
    const grid = document.getElementById('elements-grid');
    grid.innerHTML = '';

    const useTouchOnly = isMobileOrTouch();
    gameState.unlockedElements.forEach(element => {
        const div = document.createElement('div');
        div.className = 'element';
        div.draggable = !useTouchOnly;
        div.dataset.elementId = element.id;
        
        // Проверяем, новый ли это элемент
        if (!element.isBase && gameState.createdPaintings.length > 0) {
            const lastPainting = gameState.createdPaintings[gameState.createdPaintings.length - 1];
            const recipe = recipes.find(r => r.id === lastPainting);
            if (recipe && recipe.unlocks === element.id) {
                div.classList.add('new');
                setTimeout(() => div.classList.remove('new'), 3000);
            }
        }

        div.innerHTML = `
            <span class="element-icon">${element.icon}</span>
            <span class="element-name">${element.name}</span>
        `;

        // На мобильном только тап; на десктопе — drag и клик
        if (!useTouchOnly) {
            div.addEventListener('dragstart', handleDragStart);
            div.addEventListener('dragend', handleDragEnd);
        }
        div.addEventListener('click', (e) => {
            e.preventDefault();
            handleElementClick(element);
        });

        grid.appendChild(div);
    });
    
    // Восстановить подсветку выбранного элемента (если есть)
    if (gameState.selectedElement) {
        highlightSelectedElement(gameState.selectedElement.id);
    }
}

// Обработка клика по элементу
function handleElementClick(element) {
    const isMobile = isMobileOrTouch();
    
    if (isMobile) {
        // Мобильный режим: два тапа
        handleMobileElementClick(element);
    } else {
        // Десктоп: добавляем в слоты
        handleDesktopElementClick(element);
    }
}

// Мобильный режим: два тапа для комбинации
function handleMobileElementClick(element) {
    if (!gameState.selectedElement) {
        // Первый тап — выбираем элемент
        gameState.selectedElement = element;
        highlightSelectedElement(element.id);
        showSelectionBar(element);
    } else if (gameState.selectedElement.id === element.id) {
        // Тап по тому же элементу — сбрасываем выбор
        clearSelection();
    } else {
        // Тап по другому элементу — пробуем комбинацию
        tryMobileCombine(gameState.selectedElement, element);
    }
}

// Десктоп: добавляем в слоты (старая логика)
function handleDesktopElementClick(element) {
    if (!gameState.slot1) {
        gameState.slot1 = element;
        updateSlot(1, element);
    } else if (!gameState.slot2) {
        gameState.slot2 = element;
        updateSlot(2, element);
    }
}

// Drag and Drop
function handleDragStart(e) {
    e.target.classList.add('dragging');
    e.dataTransfer.setData('text/plain', e.target.dataset.elementId);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    const elementId = e.dataTransfer.getData('text/plain');
    const element = gameState.unlockedElements.find(el => el.id === elementId);
    
    if (element) {
        const slotNumber = parseInt(e.currentTarget.dataset.slot);
        if (slotNumber === 1) {
            gameState.slot1 = element;
        } else {
            gameState.slot2 = element;
        }
        updateSlot(slotNumber, element);
    }
}

// Обновление слота
function updateSlot(slotNumber, element) {
    const slot = document.getElementById(`slot${slotNumber}`);
    slot.classList.add('filled');
    slot.innerHTML = `
        <span class="element-icon">${element.icon}</span>
        <span class="element-name">${element.name}</span>
    `;
}

// Очистка слотов
function clearSlots() {
    gameState.slot1 = null;
    gameState.slot2 = null;
    resetSlotsDOM();
}

function resetSlotsDOM() {
    [1, 2].forEach(num => {
        const slot = document.getElementById(`slot${num}`);
        slot.classList.remove('filled');
        slot.innerHTML = '<span class="slot-placeholder">Перетащите элемент</span>';
    });
}

// Очистка одного слота (удобно на мобильном: тап по слоту убирает элемент)
function clearSlot(slotNumber) {
    if (slotNumber === 1) {
        gameState.slot1 = null;
    } else {
        gameState.slot2 = null;
    }
    const slot = document.getElementById(`slot${slotNumber}`);
    slot.classList.remove('filled');
    slot.innerHTML = '<span class="slot-placeholder">Перетащите элемент</span>';
}

// Создание картины
function tryCreatePainting() {
    if (!gameState.slot1 || !gameState.slot2) {
        showMessage('Поместите два элемента в слоты!', 'error');
        return;
    }

    const elements = [gameState.slot1.id, gameState.slot2.id].sort();
    
    // Поиск рецепта
    const recipe = recipes.find(r => {
        const recipeElements = [...r.elements].sort();
        return recipeElements[0] === elements[0] && recipeElements[1] === elements[1];
    });

    if (recipe) {
        if (gameState.createdPaintings.includes(recipe.id)) {
            showMessage('Вы уже создали эту картину!', 'error');
        } else {
            createPainting(recipe);
        }
        clearSlots();
    } else {
        showNoRecipeMessage();
    }
}

// Создание картины
function createPainting(recipe) {
    gameState.createdPaintings.push(recipe.id);
    
    // Разблокировка нового элемента
    if (recipe.unlocks) {
        const newElement = unlockableElements.find(el => el.id === recipe.unlocks);
        if (newElement && !gameState.unlockedElements.find(el => el.id === newElement.id)) {
            gameState.unlockedElements.push({ ...newElement });
        }
    }

    saveGameState();
    renderElements();
    renderGallery();
    updateStats();
    showPaintingModal(recipe);
}

// Стандартный градиент для всех картин (если нет изображения)
const DEFAULT_GRADIENT = 'linear-gradient(135deg, #5c6bc0 0%, #3f51b5 50%, #303f9f 100%)';

// Создание карточки картины (с изображением или заглушкой)
function createPaintingCard(recipe, size = 'large') {
    const container = document.createElement('div');
    container.className = `painting-card painting-card-${size}`;
    
    if (recipe.image) {
        const img = document.createElement('img');
        img.className = 'painting-card-img';
        img.alt = recipe.name;
        
        img.onload = function() {
            container.innerHTML = '';
            container.appendChild(img);
        };
        
        img.onerror = function() {
            // Заглушка если изображение не загрузилось
            container.innerHTML = `
                <div class="painting-card-bg" style="background: ${DEFAULT_GRADIENT};">
                    <div class="painting-card-frame">🖼️</div>
                    <div class="painting-card-title">${recipe.name}</div>
                </div>
            `;
        };
        
        img.src = recipe.image;
        
        // Показываем заглушку пока грузится
        container.innerHTML = `
            <div class="painting-card-bg" style="background: ${DEFAULT_GRADIENT};">
                <div class="painting-card-frame">🖼️</div>
                <div class="painting-card-title">${recipe.name}</div>
            </div>
        `;
    } else {
        // Нет изображения — показываем заглушку
        container.innerHTML = `
            <div class="painting-card-bg" style="background: ${DEFAULT_GRADIENT};">
                <div class="painting-card-frame">🖼️</div>
                <div class="painting-card-title">${recipe.name}</div>
            </div>
        `;
    }
    
    return container;
}

// Показать модальное окно с картиной
function showPaintingModal(recipe) {
    const modal = document.getElementById('painting-modal');
    
    const imageContainer = document.getElementById('modal-painting-image');
    imageContainer.innerHTML = '';
    imageContainer.appendChild(createPaintingCard(recipe, 'large'));
    
    document.getElementById('modal-painting-name').textContent = `"${recipe.name}"`;
    document.getElementById('modal-painting-author').textContent = `${recipe.author}, ${recipe.year}`;
    document.getElementById('modal-painting-description').textContent = recipe.description;
    
    // Новый элемент (unlocks может быть null или строкой 'null' в данных)
    const newElementDiv = document.getElementById('modal-new-element');
    const newElementReveal = document.querySelector('.new-element-reveal');
    
    const hasUnlock = recipe.unlocks && recipe.unlocks !== 'null';
    const newElement = hasUnlock ? unlockableElements.find(el => el.id === recipe.unlocks) : null;
    
    if (newElement) {
        newElementDiv.textContent = `${newElement.icon} ${newElement.name}`;
        newElementReveal.style.display = 'block';
    } else {
        newElementReveal.style.display = 'none';
    }
    
    modal.classList.add('active');
}

// Рендеринг галереи
function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    
    if (gameState.createdPaintings.length === 0) {
        grid.innerHTML = '<p class="gallery-empty">Ваша коллекция пуста. Начните комбинировать элементы!</p>';
        return;
    }

    grid.innerHTML = '';
    
    gameState.createdPaintings.forEach(paintingId => {
        const recipe = recipes.find(r => r.id === paintingId);
        if (recipe) {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            
            const imageDiv = document.createElement('div');
            imageDiv.className = 'gallery-item-image';
            
            if (recipe.image) {
                const img = document.createElement('img');
                img.className = 'gallery-thumb';
                img.alt = recipe.name;
                img.onerror = function() {
                    imageDiv.innerHTML = `
                        <div class="gallery-fallback" style="background: ${DEFAULT_GRADIENT};">
                            <span class="gallery-icon">🖼️</span>
                        </div>
                    `;
                };
                img.src = recipe.image;
                imageDiv.appendChild(img);
            } else {
                imageDiv.innerHTML = `
                    <div class="gallery-fallback" style="background: ${DEFAULT_GRADIENT};">
                        <span class="gallery-icon">🖼️</span>
                    </div>
                `;
            }
            
            const infoDiv = document.createElement('div');
            infoDiv.className = 'gallery-item-info';
            infoDiv.innerHTML = `
                <div class="gallery-item-title">"${recipe.name}"</div>
                <div class="gallery-item-author">${recipe.author}</div>
            `;
            
            item.appendChild(imageDiv);
            item.appendChild(infoDiv);
            item.addEventListener('click', () => showGalleryModal(recipe));
            grid.appendChild(item);
        }
    });
}

// Показать картину из галереи
function showGalleryModal(recipe) {
    const modal = document.getElementById('gallery-modal');
    
    const imageContainer = document.getElementById('gallery-painting-image');
    imageContainer.innerHTML = '';
    imageContainer.appendChild(createPaintingCard(recipe, 'large'));
    
    document.getElementById('gallery-painting-name').textContent = `"${recipe.name}"`;
    document.getElementById('gallery-painting-author').textContent = `${recipe.author}, ${recipe.year}`;
    document.getElementById('gallery-painting-description').textContent = recipe.description;
    
    // Вопросы для размышления (как при открытии новой картины)
    const questionsDiv = document.getElementById('gallery-modal-questions');
    if (recipe.questions && recipe.questions.length > 0) {
        questionsDiv.innerHTML = `
            <h4>Вопросы для размышления:</h4>
            <ul>
                ${recipe.questions.map(q => `<li>${q}</li>`).join('')}
            </ul>
        `;
        questionsDiv.style.display = 'block';
    } else {
        questionsDiv.innerHTML = '';
        questionsDiv.style.display = 'none';
    }
    
    modal.classList.add('active');
}

// Обновление статистики
function updateStats() {
    document.getElementById('paintings-count').textContent = gameState.createdPaintings.length;
    document.getElementById('elements-count').textContent = gameState.unlockedElements.length;
}

// Показать сообщение
function showMessage(text, type) {
    const combineZone = document.querySelector('.combine-zone');
    
    const existingMsg = combineZone.querySelector('.error-message, .success-message');
    if (existingMsg) existingMsg.remove();
    
    const msg = document.createElement('div');
    msg.className = type === 'error' ? 'error-message' : 'success-message';
    msg.textContent = text;
    combineZone.appendChild(msg);
    
    setTimeout(() => msg.remove(), 3000);
}

// Сообщение при неизвестной комбинации + ссылка «Предложить свой вариант»
function showNoRecipeMessage() {
    const combineZone = document.querySelector('.combine-zone');
    
    const existingMsg = combineZone.querySelector('.error-message, .success-message');
    if (existingMsg) existingMsg.remove();
    
    const msg = document.createElement('div');
    msg.className = 'error-message error-with-suggest';
    msg.innerHTML = 'Эта комбинация не создаёт картину. <button type="button" class="suggest-link">Предложить свой вариант</button>';
    combineZone.appendChild(msg);
    
    msg.querySelector('.suggest-link').addEventListener('click', () => {
        msg.remove();
        showSuggestModal();
    });
}

// Показать модальное окно «Предложить свой вариант»
function showSuggestModal() {
    if (!gameState.slot1 || !gameState.slot2) return;
    
    const comboEl = document.getElementById('suggest-combination');
    comboEl.innerHTML = `
        <span class="suggest-el">${gameState.slot1.icon} ${gameState.slot1.name}</span>
        <span class="suggest-plus">+</span>
        <span class="suggest-el">${gameState.slot2.icon} ${gameState.slot2.name}</span>
    `;
    
    document.getElementById('suggest-name').value = '';
    document.getElementById('suggest-author').value = '';
    document.getElementById('suggest-modal').classList.add('active');
}

// Закрыть модальное окно предложения и очистить слоты
function closeSuggestModal() {
    document.getElementById('suggest-modal').classList.remove('active');
    clearSlots();
}

// Отправить предложение на почту (mailto)
function sendSuggestToEmail(name, author) {
    const el1 = gameState.slot1 ? `${gameState.slot1.icon} ${gameState.slot1.name}` : '';
    const el2 = gameState.slot2 ? `${gameState.slot2.icon} ${gameState.slot2.name}` : '';
    const body = `Комбинация элементов: ${el1} + ${el2}\n\nПредложенное название картины: ${name}\nПредложенный автор: ${author}`;
    const subject = `Предложение для Мозаики: "${name}" — ${author}`;
    const mailto = `mailto:svetoch22@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    closeSuggestModal();
}

// Подсказка (десктоп)
function showHint() {
    const availableRecipes = recipes.filter(r => {
        if (gameState.createdPaintings.includes(r.id)) return false;
        return r.elements.every(elId => 
            gameState.unlockedElements.find(el => el.id === elId)
        );
    });

    const hintText = document.getElementById('hint-text');
    
    if (availableRecipes.length === 0) {
        hintText.textContent = 'Поздравляем! Вы создали все доступные картины!';
    } else {
        const randomRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
        const el1 = gameState.unlockedElements.find(el => el.id === randomRecipe.elements[0]);
        const el2 = gameState.unlockedElements.find(el => el.id === randomRecipe.elements[1]);
        hintText.textContent = `Попробуйте: ${el1.icon} ${el1.name} + ${el2.icon} ${el2.name}`;
    }
}

// Подсказка (мобильный)
function showMobileHint() {
    const availableRecipes = recipes.filter(r => {
        if (gameState.createdPaintings.includes(r.id)) return false;
        return r.elements.every(elId => 
            gameState.unlockedElements.find(el => el.id === elId)
        );
    });

    const hintText = document.getElementById('mobile-hint-text');
    if (!hintText) return;
    
    // Скрыть подсказку над сеткой
    const elementsHint = document.getElementById('mobile-elements-hint');
    if (elementsHint) {
        elementsHint.classList.add('dismissed');
    }
    
    if (availableRecipes.length === 0) {
        hintText.textContent = 'Поздравляем! Вы создали все доступные картины!';
    } else {
        const randomRecipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
        const el1 = gameState.unlockedElements.find(el => el.id === randomRecipe.elements[0]);
        const el2 = gameState.unlockedElements.find(el => el.id === randomRecipe.elements[1]);
        hintText.textContent = `Попробуйте: ${el1.icon} ${el1.name} + ${el2.icon} ${el2.name}`;
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Слоты: перетаскивание (десктоп) и тап для очистки (мобильный)
    const slots = document.querySelectorAll('.slot');
    slots.forEach(slot => {
        slot.addEventListener('dragover', handleDragOver);
        slot.addEventListener('dragleave', handleDragLeave);
        slot.addEventListener('drop', handleDrop);
        if (isMobileOrTouch()) {
            slot.addEventListener('click', () => {
                const num = parseInt(slot.dataset.slot, 10);
                if (slot.classList.contains('filled')) {
                    clearSlot(num);
                }
            });
        }
    });

    // Кнопки
    document.getElementById('combine-btn').addEventListener('click', () => {
        tryCreatePainting();
    });
    document.getElementById('clear-btn').addEventListener('click', clearSlots);
    document.getElementById('hint-btn').addEventListener('click', showHint);
    
    // Мобильная кнопка подсказки
    const mobileHintBtn = document.getElementById('mobile-hint-btn');
    if (mobileHintBtn) {
        mobileHintBtn.addEventListener('click', showMobileHint);
    }

    document.getElementById('guide-link').addEventListener('click', function(e) {
        e.preventDefault();
        var ids = gameState.unlockedElements.map(function(el) { return el.id; });
        var q = ids.length ? '?unlocked=' + encodeURIComponent(ids.join(',')) : '';
        window.location.href = 'guide.html' + q;
    });

    // Кнопка сброса выбора в мобильном индикаторе
    const selectionClearBtn = document.getElementById('selection-clear');
    if (selectionClearBtn) {
        selectionClearBtn.addEventListener('click', clearSelection);
    }

    // Закрытие модальных окон
    document.getElementById('close-modal').addEventListener('click', () => {
        document.getElementById('painting-modal').classList.remove('active');
    });
    
    document.getElementById('close-gallery-modal').addEventListener('click', () => {
        document.getElementById('gallery-modal').classList.remove('active');
    });

    // Кнопки "Продолжить" / "Закрыть" в модальных окнах
    document.getElementById('painting-continue-btn').addEventListener('click', () => {
        document.getElementById('painting-modal').classList.remove('active');
    });
    
    document.getElementById('gallery-continue-btn').addEventListener('click', () => {
        document.getElementById('gallery-modal').classList.remove('active');
    });

    document.getElementById('close-suggest-modal').addEventListener('click', closeSuggestModal);

    document.getElementById('suggest-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('suggest-name').value.trim();
        const author = document.getElementById('suggest-author').value.trim();
        if (name && author) {
            sendSuggestToEmail(name, author);
        }
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                if (modal.id === 'suggest-modal') {
                    clearSlots();
                }
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.classList.remove('active');
            });
            if (document.getElementById('suggest-modal').classList.contains('active')) {
                clearSlots();
            }
        }
    });
}

// Запуск игры
document.addEventListener('DOMContentLoaded', initGame);
