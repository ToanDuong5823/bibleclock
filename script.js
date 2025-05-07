const bibleBooks = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
    "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah",
    "Esther", "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
    "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum",
    "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John",
    "Acts", "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians", "Philippians",
    "Colossians", "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon",
    "Hebrews", "James", "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation"
];

async function loadBibleMapping() {
    try {
        const response = await fetch('bible.json');
        const bibleData = await response.json();
        if (Array.isArray(bibleData)) {
            return bibleData;
        } else {
            return [];
        }
    } catch (error) {
        document.getElementById('verse-text').innerHTML = '<p style="color: var(--error-color);">Error loading Bible data. Please ensure bible.json is available.</p>';
        document.getElementById('verse-reference').textContent = '— Error';
        return [];
    }
}

function updateDigitalClock() {
    const now = new Date();
    const hours = now.getHours(); // Keep as number for logic
    const minutes = now.getMinutes(); // Keep as number for logic
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('digital-time').textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${seconds}`;
    return { hours, minutes, seconds }; // Return numbers for hours/minutes
}

function getChapterFromHour(hour) {
    return hour === 0 ? 24 : hour;
}

function findValidBooks(bibleData, hour, verse) {
    if (!bibleData || !Array.isArray(bibleData) || bibleData.length === 0) {
        return [];
    }
    const validBooks = [];
    const chapter = getChapterFromHour(hour);
    verse = parseInt(verse);

    for (const bookData of bibleData) {
        if (!bookData.chapters || bookData.chapters.length < chapter) continue;
        const chapterData = bookData.chapters[chapter - 1];
        if (chapterData && parseInt(chapterData.verses) >= verse) {
            validBooks.push(bookData.book);
        }
    }
    return validBooks;
}

 async function fetchBibleVerse(book, hour, verse) {
    const chapter = getChapterFromHour(hour);
    const reference = `${book} ${chapter}:${verse}`;
    // Using a CORS proxy - ensure this proxy is reliable or use a different one if needed.
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv`)}`; // Added KJV translation

    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            if (response.status === 429) {
                console.warn('Rate limit likely exceeded for Bible API via proxy.');
            }
            return null;
        }
        const data = await response.json();

        if (!data.contents || data.contents.includes("Verse not found") || data.contents.includes("not found")) {
            return null;
        }

        // Basic check for valid JSON structure
        try {
            const parsedContents = JSON.parse(data.contents);
            if (parsedContents && parsedContents.text && parsedContents.reference) {
                return parsedContents;
            } else {
                return null;
            }
        } catch (parseError) {
            console.error("Error parsing Bible API response:", parseError, data.contents);
            // Attempt to gracefully handle cases where the API returns HTML error pages through the proxy
            if (typeof data.contents === 'string' && data.contents.toLowerCase().includes('<html')) {
                console.warn('Received HTML content instead of JSON, likely an error page from the proxy or API.');
            }
            return null;
        }

    } catch (error) {
        console.error("Network or other error fetching verse:", error);
        // Handle network errors or proxy failures
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('Network error or CORS issue with the proxy.');
        // Optionally display a message about checking the network connection or proxy status
        }
        return null;
    }
}


function displayNoVerseMessage(hours, minutes) {
    const verseTextElement = document.getElementById('verse-text');
    const verseReferenceElement = document.getElementById('verse-reference');
    const translationInfoElement = document.getElementById('translation-info');

    const displayChapter = getChapterFromHour(hours);
    const displayHours = String(hours).padStart(2, '0');
    const displayMinutes = String(minutes).padStart(2, '0');

    verseTextElement.innerHTML = `
        <p>There are no Bible verses that match ${displayHours}:${displayMinutes}.</p>
        <p>(Chapter ${displayChapter}, Verse ${displayMinutes})</p>`;
    verseReferenceElement.textContent = '— No verse available';
    translationInfoElement.textContent = '';

     // Ensure fade-in applies if called directly after fade-out
    requestAnimationFrame(() => {
        verseTextElement.classList.remove('fade-out');
        verseReferenceElement.classList.remove('fade-out');
        translationInfoElement.classList.remove('fade-out');
    });
}

async function initTheme() {
    const themeToggle = document.getElementById('theme-toggle'); // Use the ID from index.html

    function applyTheme(isDark) {
        if (isDark) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
        // Update toggle button text/icon if needed (using index.html icons)
    }

    function detectSystemTheme() {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        applyTheme(prefersDark);
        // Store preference? Optional.
    }

    // Initial theme detection
    detectSystemTheme();

    // Listen for system theme changes
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => applyTheme(e.matches));
    }

     // Manual theme toggle button
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.toggle('dark-mode');
        // Store preference? Optional.
    });
}

async function preloadNextVerse(bibleDataRef) {
    const now = new Date();
    const nextMinuteTime = new Date(now.getTime() + 60000); // Add 1 minute
    const nextHours = nextMinuteTime.getHours();
    const nextMinutes = nextMinuteTime.getMinutes();

// Update preloaded verse state - reset it for the new minute
    window.preloadedVerseData = {
        hours: nextHours,
        minutes: nextMinutes,
        verseData: null,
        isPreloaded: false
    };

    if (nextMinutes === 0) {
        return; // Don't preload for verse 0
    }

     const validBooks = findValidBooks(bibleDataRef, nextHours, nextMinutes);
    if (!validBooks || validBooks.length === 0) {
        // Preloaded data remains null, isPreloaded: false - displayVerse will handle this.
        return;
    }

    let verseFound = false;
    const booksToTry = [...validBooks]; // Create a copy to modify

    while (booksToTry.length > 0 && !verseFound) {
        const randomIndex = Math.floor(Math.random() * booksToTry.length);
        const book = booksToTry.splice(randomIndex, 1)[0]; // Pick and remove


        try {
            const verseResult = await fetchBibleVerse(book, nextHours, nextMinutes);
            if (verseResult) {
                window.preloadedVerseData.verseData = verseResult;
                window.preloadedVerseData.isPreloaded = true;
                verseFound = true; // Found a verse, exit loop
            } else {
                console.log(`Workspace failed for ${book} ${getChapterFromHour(nextHours)}:${nextMinutes}. Trying next book.`);
            }
        } catch (error) {
            console.error(`Error during preload fetch for ${book} ${getChapterFromHour(nextHours)}:${nextMinutes}:`, error);
            // Continue trying other books
        }

        // Add a small delay between attempts to avoid hammering the API
        if (!verseFound && booksToTry.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before next attempt
        }
    }

    if (!verseFound) {
        console.log(`Preload failed after trying all valid books for ${String(nextHours).padStart(2, '0')}:${String(nextMinutes).padStart(2, '0')}.`);
        // Preloaded data remains null, isPreloaded: false - displayVerse will handle this.
    }
}

async function displayVerse(bibleDataRef, hours, minutes) {
    const verseTextElement = document.getElementById('verse-text');
    const verseReferenceElement = document.getElementById('verse-reference');
    const translationInfoElement = document.getElementById('translation-info');

    // Start fade out effect
    verseTextElement.classList.add('fade-out');
    verseReferenceElement.classList.add('fade-out');
    translationInfoElement.classList.add('fade-out');

    // Use a shorter timeout, relying on CSS transition duration
    await new Promise(resolve => setTimeout(resolve, 500)); // Wait for fade out

    // --- Logic to display content ---
    if (minutes === 0) {
        const displayHours = String(hours).padStart(2, '0');
        verseTextElement.innerHTML = `<p>It's ${displayHours}:00. No 'verse 0' exists.</p><p>Waiting for the next minute...</p>`;
        verseReferenceElement.textContent = '— Hour Mark';
        translationInfoElement.textContent = '';
    } else if (window.preloadedVerseData && window.preloadedVerseData.isPreloaded &&
            window.preloadedVerseData.hours === hours && window.preloadedVerseData.minutes === minutes) {
        // Use preloaded verse
        const preloaded = window.preloadedVerseData.verseData;
        verseTextElement.innerHTML = preloaded.text.trim();
        verseReferenceElement.textContent = `— ${preloaded.reference}`;
        translationInfoElement.textContent = preloaded.translation_name || 'KJV'; // Default to KJV if not present
        window.preloadedVerseData.isPreloaded = false; // Reset preload flag
    } else {
        // Fetch a new verse if not preloaded or preload failed/mismatched
        verseTextElement.innerHTML = `<p class="loading">Finding verse for ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}...</p>`;
        verseReferenceElement.textContent = '— Loading...';
        translationInfoElement.textContent = '';

        const validBooks = findValidBooks(bibleDataRef, hours, minutes);
        if (!validBooks || validBooks.length === 0) {
            displayNoVerseMessage(hours, minutes); // Update immediately, no extra fade needed
            // No return here, allow fade-in below
        } else {
            let verseFound = false;
            // Try a few random valid books - this part remains as a fallback if preload totally failed
            const attempts = Math.min(validBooks.length, 3); // Try up to 3 random books
            const booksForDisplayAttempt = [...validBooks]; // Copy for display attempts
            for (let i = 0; i < attempts; i++) {
                const randomIndex = Math.floor(Math.random() * booksForDisplayAttempt.length);
                const book = booksForDisplayAttempt.splice(randomIndex, 1)[0]; // Pick and remove
                const verseResult = await fetchBibleVerse(book, hours, minutes);
                if (verseResult) {
                    verseTextElement.innerHTML = verseResult.text.trim();
                    verseReferenceElement.textContent = `— ${verseResult.reference}`;
                    translationInfoElement.textContent = verseResult.translation_name || 'KJV';
                    verseFound = true;
                    break; // Stop after finding one
                }
            }
            if (!verseFound) {
                displayNoVerseMessage(hours, minutes); // Update if all attempts failed
                // No return here, allow fade-in below
            }
        }
    }

    // --- End Logic ---

    // Fade in the new content
    requestAnimationFrame(() => {
        verseTextElement.classList.remove('fade-out');
        verseReferenceElement.classList.remove('fade-out');
        translationInfoElement.classList.remove('fade-out');
    });

    // Trigger preload for the *next* minute slightly after displaying current
    // The preload function now handles persistent attempts internally
    setTimeout(() => preloadNextVerse(bibleDataRef), 1000); // Preload 1s after display
}


// Main clock initialization function
async function initializeClock() {
    initTheme(); // Initialize theme first

    const bibleData = await loadBibleMapping();
    // Check if bibleData loaded correctly
    if (!bibleData || bibleData.length === 0) {
        console.error("Bible Clock initialization failed: No Bible data.");
        // Display an error message in the clock container if needed
        return; // Stop initialization if data is missing
    }

    // Initial digital clock update
    updateDigitalClock();

    // Set up preloaded verse data object
    window.preloadedVerseData = { hours: -1, minutes: -1, verseData: null, isPreloaded: false };

    // Initial verse display
    const initialTime = new Date();
    const initialHours = initialTime.getHours();
    const initialMinutes = initialTime.getMinutes();
    await displayVerse(bibleData, initialHours, initialMinutes); // Wait for the first display

    // Update digital time every second
    setInterval(updateDigitalClock, 1000);

    // Check for minute change every second
    let lastMinute = initialMinutes;
    setInterval(async () => {
        const currentTime = new Date();
        const currentMinute = currentTime.getMinutes();
        if (currentMinute !== lastMinute) {
            lastMinute = currentMinute;
            const currentHour = currentTime.getHours();
            await displayVerse(bibleData, currentHour, currentMinute);
        }
    }, 1000); // Check every second
}


// ===== Timer Script =====
// Wrap timer script in its own scope to avoid variable conflicts
(function() {
    // Elements for Timer
    const timerDisplay = document.getElementById('timer');
    // Updated button references
    const playPauseButton = document.getElementById('play-pause-button');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const resetButton = document.getElementById('reset-button'); // Updated reference

    const presetButtons = document.querySelectorAll('.preset-btn');
    const setTimeButton = document.getElementById('set-time');
    const hoursInput = document.getElementById('hours');
    const minutesInput = document.getElementById('minutes');
    const secondsInput = document.getElementById('seconds');
    const toggleSound = document.getElementById('toggle-sound');
    // Note: Theme toggle is handled by the index.html script

    // Timer variables
    let totalSeconds = 0;
    let timerInterval = null;
    let isRunning = false;
    let audioContext = null; // For sound alert
    let lastSetTime = 0; // Added to store the last set time for reset


    function getAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContext;
    }

    // Format time for timer display
    function formatTimerTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return [
            hours.toString().padStart(2, '0'),
            minutes.toString().padStart(2, '0'),
            secs.toString().padStart(2, '0')
        ].join(':');
    }

    // Update the timer display
    function updateTimerDisplay() {
        timerDisplay.textContent = formatTimerTime(totalSeconds);
        // Reset color if it was changed by completion alert
        timerDisplay.style.color = ''; // Reverts to CSS variable
    }

    // Start the timer
    function startTimer() {
        if (!isRunning && totalSeconds > 0) {
            isRunning = true;
            togglePlayPauseIcon(); // Change icon to pause
            // Ensure display is updated immediately when starting
            updateTimerDisplay();
            timerInterval = setInterval(function() {
                totalSeconds--;
                updateTimerDisplay();
                if (totalSeconds <= 0) {
                    clearInterval(timerInterval);
                    isRunning = false;
                    togglePlayPauseIcon(); // Change icon back to play
                    timerComplete();
                }
            }, 1000);
        }
    }

    // Pause the timer
    function pauseTimer() {
        if (isRunning) {
            clearInterval(timerInterval);
            isRunning = false;
            togglePlayPauseIcon(); // Change icon to play
        }
    }

     // Reset the timer
     function resetTimer() {
        pauseTimer(); // Stop any running timer
        totalSeconds = lastSetTime; // Reset to the last set duration
        updateTimerDisplay();
        togglePlayPauseIcon(); // Ensure play icon is shown on reset
    }

     // Function to set the timer time and store it
     function setTimerTime(secondsValue) {
        pauseTimer(); // Stop any running timer
        totalSeconds = Math.max(0, secondsValue); // Ensure non-negative
        lastSetTime = totalSeconds; // Store this as the last set duration
        updateTimerDisplay();
        togglePlayPauseIcon(); // Ensure play icon is shown
     }


    // Set a custom time from inputs
    function setCustomTime() {
        const hours = parseInt(hoursInput.value) || 0;
        const minutes = parseInt(minutesInput.value) || 0;
        const seconds = parseInt(secondsInput.value) || 0;
        const timeToSet = hours * 3600 + minutes * 60 + seconds;
        setTimerTime(timeToSet); // Use the unified function

        // Clear input fields after setting
        hoursInput.value = '';
        minutesInput.value = '';
        secondsInput.value = '';
    }

    // Toggle between play and pause icons
    function togglePlayPauseIcon() {
        if (isRunning) {
            playIcon.classList.add('bi-hidden');
            pauseIcon.classList.remove('bi-hidden');
        } else {
            playIcon.classList.remove('bi-hidden');
            pauseIcon.classList.add('bi-hidden');
        }
    }

    // Timer complete alert
    function timerComplete() {
        if (toggleSound.checked) {
            try {
                const context = getAudioContext();
                // Short beep sound
                const oscillator = context.createOscillator();
                const gainNode = context.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(880, context.currentTime); // A4 note
                gainNode.gain.setValueAtTime(0.3, context.currentTime); // Quieter beep
                gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.5); // Fade out

                oscillator.connect(gainNode);
                gainNode.connect(context.destination);
                oscillator.start(context.currentTime);
                oscillator.stop(context.currentTime + 0.5); // 0.5 second beep
            } catch (e) {
                console.error("Failed to play sound:", e);
            }
        }
        // Visual alert: Flash color briefly
        timerDisplay.style.color = 'var(--error-color)'; // Use theme error color
        setTimeout(() => {
           // Only reset color if timer hasn't been reset/changed
            if (totalSeconds === 0 && !isRunning) {
               timerDisplay.style.color = ''; // Revert to theme text color
            }
        }, 1500); // Shorter visual alert
    }

    // Event Listeners for Timer
    // Use the single playPauseButton
    playPauseButton.addEventListener('click', function() {
        if (isRunning) {
            startTimer(); // Changed from pauseTimer() based on typical play/pause logic
        } else {
            startTimer();
        }
    });


     // Reset button
    resetButton.addEventListener('click', resetTimer);

    // Preset buttons use the unified set function
    presetButtons.forEach(button => {
        button.addEventListener('click', function() {
            const time = parseInt(this.dataset.time);
            setTimerTime(time);
        });
    });

    // Set custom time button
    setTimeButton.addEventListener('click', setCustomTime);

     // Initialize timer display and icons on load
    updateTimerDisplay();
    togglePlayPauseIcon();


})(); // End timer script scope

// Initialize Clock (must run after DOM is ready)
window.onload = initializeClock;
