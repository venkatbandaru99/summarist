// popup.js v13 - Fixed Interactive Buttons with Debug
import { 
    initializeApp,
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence,
    //getFirebaseIdTokenFromChrome,  // ✅ ADD THIS
    getValidFirebaseIdToken   
} from './lib/firebase-bundle.js';
import { firebaseConfig } from './firebase-config.js';

console.log('=== POPUP.JS V13 - FIXED WITH DEBUG ===');

// Initialize Firebase
let app, auth;

try {
    console.log('🔧 Initializing Firebase with bundle...');
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    console.log('✅ Firebase bundle initialized successfully');
} catch (error) {
    console.error('❌ Firebase bundle initialization failed:', error);
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOM READY ===');
    
    if (auth) {
        console.log( '✅ Firebase bundle ready!');
    } else {
        console.log( '❌ Firebase bundle failed');
    }
    
    // Test button
    document.getElementById('testBtn').addEventListener('click', async function() {
        console.log('🧪 Testing background communication...');
        
        try {
            const response = await chrome.runtime.sendMessage({action: 'test'});
            console.log('📨 Test response:', response);
            alert('Background communication: ' + response.message);
        } catch (error) {
            console.error('❌ Communication failed:', error);
            alert('Communication failed: ' + error.message);
        }
    });
    
    // Login button
    document.getElementById('loginBtn').addEventListener('click', async function() {
        console.log('🔥 LOGIN BUTTON CLICKED!');
        
        if (!auth) {
            alert('Firebase bundle not loaded.');
            return;
        }
        
        try {
            console.log( '🔄 Attempting Chrome Identity login...');
            
            const provider = new GoogleAuthProvider();
            provider.addScope('email');
            provider.addScope('profile');
            
            console.log('📋 Using Chrome Identity API...');
            
            const result = await signInWithPopup(auth, provider);
            
            console.log('✅ Login success!');
            console.log('👤 User:', result.user.email);
            
            console.log( '✅ Login successful!');
            
        } catch (error) {
            console.error('❌ Login failed:', error);
            console.log( '❌ Login failed');
            alert('Login failed: ' + error.message);
        }
    });
    
    // Import Bookmarks button
    document.getElementById('importBtn').addEventListener('click', async function() {
        console.log('📚 IMPORT BOOKMARKS CLICKED!');
        await importBookmarks();
    });
    
    // View Bookmarks button
    document.getElementById('viewBtn').addEventListener('click', async function() {
        console.log('👁️ VIEW BOOKMARKS CLICKED!');
        await loadAndDisplayBookmarks();
    });
    
/*    // DEBUG BUTTON - CRITICAL FIX
    document.getElementById('debugBtn').addEventListener('click', function() {
        console.log('🔍 DEBUG BUTTON CLICKED!');
        debugInteractiveButtons();
    });*/
    
    // Auth state listener
    if (auth) {
        onAuthStateChanged(auth, (user) => {
            console.log('🔄 Auth state:', user ? user.email : 'No user');
            
            if (user) {
                document.getElementById('auth-container').classList.add('hidden');
                document.getElementById('app-container').classList.remove('hidden');
                document.getElementById('userEmail').textContent = user.email;
                
                // Load bookmark count and existing bookmarks
                loadBookmarkData();
            } else {
                document.getElementById('auth-container').classList.remove('hidden');
                document.getElementById('app-container').classList.add('hidden');
            }
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', function() {
            console.log('🚪 Logout clicked');
            signOut(auth);
        });
    }
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        console.log('📨 Popup received message:', request);
        
        if (request.action === 'saveBookmark') {
            console.log('💾 Handling Firestore save request...');
            saveBookmarkToFirestore(request.bookmark, request.userId)
                .then(result => sendResponse({success: true, result}))
                .catch(error => sendResponse({success: false, error: error.message}));
            return true;
        }
        
        if (request.action === 'importProgress') {
            updateImportProgress(request.processed, request.total, request.percentage);
        }
    });
    
/*    // Auto-debug after 3 seconds
    setTimeout(() => {
        console.log('🔧 AUTO-DEBUG: Running automatic button check...');
        autoDebugButtons();
    }, 3000);*/
});

// CRITICAL DEBUG FUNCTION
/*function debugInteractiveButtons() {
    console.log('🔍 DEBUGGING INTERACTIVE BUTTONS');
    
    // Clear previous debug info
    document.getElementById('status').innerHTML = '';
    
    let debugInfo = ['=== DEBUG RESULTS ==='];
    
    // Check if bookmark list section exists
    const bookmarkListSection = document.getElementById('bookmarkListSection');
    debugInfo.push(`Bookmark list section: ${bookmarkListSection ? 'EXISTS' : 'MISSING'}`);
    debugInfo.push(`Section display: ${bookmarkListSection ? bookmarkListSection.style.display : 'N/A'}`);
    
    // Check if categories exist
    const categories = ['quickReads', 'deepDives', 'processing'];
    categories.forEach(categoryId => {
        const container = document.getElementById(categoryId);
        debugInfo.push(`Category ${categoryId}: ${container ? 'EXISTS' : 'MISSING'}`);
        
        if (container) {
            const buttons = container.querySelectorAll('.action-btn');
            debugInfo.push(`  Buttons in ${categoryId}: ${buttons.length}`);
            
            // Highlight buttons and add test handlers
            buttons.forEach((button, index) => {
                button.classList.add('debug-highlight');
                button.style.border = '3px solid red';
                button.style.background = 'yellow';
                
                // Remove existing listeners and add new test ones
                const newButton = button.cloneNode(true);
                button.parentNode.replaceChild(newButton, button);
                
                newButton.addEventListener('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🔥 TEST BUTTON ${index} in ${categoryId} CLICKED!`);
                    alert(`Button ${index} in ${categoryId} is working!`);
                });
                
                debugInfo.push(`    Button ${index}: ${newButton.className}`);
            });
        }
    });
    
    // Check for any .action-btn elements in the entire document
    const allActionButtons = document.querySelectorAll('.action-btn');
    debugInfo.push(`Total action buttons found: ${allActionButtons.length}`);
    
    // Display debug info
    document.getElementById('status').innerHTML = debugInfo.join('<br>');
    
    if (allActionButtons.length === 0) {
        alert('❌ NO ACTION BUTTONS FOUND! Make sure to click "View Bookmarks" first to load your bookmarks.');
    } else {
        alert(`✅ Found ${allActionButtons.length} buttons. They now have red borders and test click handlers. Try clicking them!`);
    }
}

// Auto debug function
function autoDebugButtons() {
    const allActionButtons = document.querySelectorAll('.action-btn');
    console.log(`🔧 AUTO-DEBUG: Found ${allActionButtons.length} action buttons`);
    
    if (allActionButtons.length > 0) {
        console.log('🔧 AUTO-DEBUG: Adding test listeners to existing buttons...');
        allActionButtons.forEach((btn, i) => {
            btn.style.border = '2px solid orange';
            
            // Clone and replace to remove old listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log(`🔥 AUTO-DEBUG: Button ${i} clicked!`);
                alert(`Auto-debug: Button ${i} works!`);
            });
        });
    }
}*/

// Update the loadBookmarkData function to show selective import option
async function loadBookmarkData() {
    try {
        console.log('📊 Loading bookmark data...');
        
        const bookmarkCountElement = document.getElementById('bookmarkCount');
        const savedBookmarkCountElement = document.getElementById('savedBookmarkCount');
        
        bookmarkCountElement.textContent = 'Analyzing bookmarks...';
        savedBookmarkCountElement.textContent = 'Checking saved bookmarks...';
        
        // Get full bookmark analysis
        const analysisResponse = await chrome.runtime.sendMessage({action: 'analyzeBookmarks'});
        
        console.log('📊 Bookmark analysis response:', analysisResponse);
        
        if (analysisResponse && analysisResponse.success) {
            const analysis = analysisResponse.analysis;
            
            if (analysis.totalBookmarks === 0) {
                bookmarkCountElement.textContent = 'No bookmarks found to import';
                bookmarkCountElement.style.color = '#666';
                document.getElementById('importBtn').disabled = true;
                document.getElementById('importBtn').textContent = 'No Bookmarks to Import';
            } else {
                bookmarkCountElement.innerHTML = `
                    <div>${analysis.totalBookmarks} bookmarks available to import</div>
                    <div style="font-size: 12px; color: #666; margin-top: 4px;">
                        ${analysis.folderCount} folders: ${analysis.folders.slice(0, 3).map(f => f.name).join(', ')}
                        ${analysis.folders.length > 3 ? ` + ${analysis.folders.length - 3} more` : ''}
                    </div>
                `;
                bookmarkCountElement.style.color = '#333';
                document.getElementById('importBtn').disabled = false;
                document.getElementById('importBtn').textContent = 'Choose Folders to Import';
            }
        } else {
            bookmarkCountElement.textContent = 'Error analyzing bookmarks';
            bookmarkCountElement.style.color = '#d32f2f';
            console.error('❌ Failed to analyze bookmarks:', analysisResponse?.error);
        }
        
        await checkSavedBookmarks();
        
    } catch (error) {
        console.error('❌ Error loading bookmark data:', error);
        document.getElementById('bookmarkCount').textContent = 'Error loading bookmark data';
        document.getElementById('bookmarkCount').style.color = '#d32f2f';
    }
}

async function checkSavedBookmarks() {
    try {
        console.log('📊 Checking saved bookmarks with Firebase ID token...');
        
        const savedBookmarkCountElement = document.getElementById('savedBookmarkCount');
        const viewBtn = document.getElementById('viewBtn');
        
        savedBookmarkCountElement.textContent = 'Checking saved bookmarks...';
        viewBtn.disabled = true;
        
        // ✅ Get Firebase ID token (not Chrome token)-- reverted to chrome
        //const firebaseIdToken = await chrome.identity.getAuthToken({ interactive: false });
        const firebaseIdToken = await getValidFirebaseIdToken();
        const userId = auth.currentUser.uid;
        
        console.log('🔑 Using Firebase ID token for Firestore access');
        
        const response = await chrome.runtime.sendMessage({
            action: 'getBookmarks',
            userId: userId,
            firebaseIdToken: firebaseIdToken  // ✅ firebase ID token
        });
        
        console.log('📊 Get bookmarks response:', response);
        
        if (response && response.success) {
            const bookmarkCount = response.bookmarks.length;
            
            if (bookmarkCount === 0) {
                savedBookmarkCountElement.textContent = 'No saved bookmarks yet';
                savedBookmarkCountElement.style.color = '#666';
                viewBtn.disabled = true;
                viewBtn.textContent = 'Import Bookmarks First';
            } else {
                savedBookmarkCountElement.textContent = `${bookmarkCount} bookmarks saved`;
                savedBookmarkCountElement.style.color = '#4caf50';
                viewBtn.disabled = false;
                viewBtn.textContent = 'View Your Bookmarks';
            }
        } else {
            throw new Error(response?.error || 'Failed to get saved bookmarks');
        }
        
    } catch (error) {
        console.error('❌ Error checking saved bookmarks:', error);
        
        const savedBookmarkCountElement = document.getElementById('savedBookmarkCount');
        const viewBtn = document.getElementById('viewBtn');
        
        savedBookmarkCountElement.textContent = 'Error checking bookmarks';
        savedBookmarkCountElement.style.color = '#d32f2f';
        viewBtn.disabled = true;
        viewBtn.textContent = 'Error Loading';
    }
}


async function importBookmarks() {
    try {
        if (!auth.currentUser) {
            alert('Please login first');
            return;
        }
        
        console.log('📚 Starting selective bookmark import...');
        
        const importBtn = document.getElementById('importBtn');
        if (importBtn.disabled) {
            alert('No bookmarks available to import.');
            return;
        }
        
        // Get folder selection...
        showImportProgress();
        document.getElementById('importProgressText').textContent = 'Analyzing bookmark structure...';
        
        const treeResponse = await chrome.runtime.sendMessage({action: 'getBookmarkTree'});
        
        if (!treeResponse || !treeResponse.success) {
            throw new Error(treeResponse?.error || 'Failed to get bookmark structure');
        }
        
        hideImportProgress();
        
        const selectedFolders = await showFolderSelectionDialog(treeResponse.tree);
        
        if (!selectedFolders || selectedFolders.length === 0) {
            console.log('User cancelled or selected no folders');
            return;
        }
        
        // ✅ Get Firebase ID token for import-- reverted to chrome
        //const firebaseIdToken = await chrome.identity.getAuthToken({ interactive: false });
        const firebaseIdToken = await getValidFirebaseIdToken();
        
        showImportProgress();
        document.getElementById('importProgressText').textContent = 'Importing selected bookmarks...';
        
        const importResponse = await chrome.runtime.sendMessage({
            action: 'importSelectedBookmarks',
            userId: auth.currentUser.uid,
            selectedFolders: selectedFolders,
            firebaseIdToken: firebaseIdToken // ✅ Chrome ID token
        });
        
        if (importResponse && importResponse.success) {
            console.log('✅ Selective import completed:', importResponse.result);
            showImportComplete(importResponse.result);
            await checkSavedBookmarks();
        } else {
            throw new Error(importResponse?.error || 'Import failed');
        }
        
    } catch (error) {
        console.error('❌ Import failed:', error);
        alert(`Import failed: ${error.message}`);
        hideImportProgress();
    }
}

async function saveBookmarkToFirestore(bookmark, userId) {
    try {
        console.log('💾 Saving bookmark to Firestore:', bookmark.title);
        
        if (!auth.currentUser) {
            throw new Error('User not authenticated');
        }
        
        // ✅ ADD: Get firbaseIdToken token for authentication
        //const firebaseIdToken = await chrome.identity.getAuthToken({ interactive: false });
        const firebaseIdToken = await getValidFirebaseIdToken();
        
        if (!firebaseIdToken) {
            throw new Error('No Chrome authentication token available');
        }
        
        const saveResult = await chrome.runtime.sendMessage({
            action: 'saveToFirestore',
            bookmark: {
                title: bookmark.title,
                url: bookmark.url,
                folder: bookmark.folder || '',
                dateAdded: bookmark.dateAdded || new Date(),
                dateImported: new Date(),
                status: 'pending',
                summary: null,
                readingTime: null,
                category: null,
                tags: [],
                isRead: false
            },
            userId: userId,
            firebaseIdToken: firebaseIdToken // ✅ ADD: Pass Chrome token
        });
        
        if (saveResult && saveResult.success) {
            console.log(`✅ Successfully saved: ${bookmark.title}`);
            return saveResult.result;
        } else {
            throw new Error(saveResult?.error || 'Save failed');
        }
        
    } catch (error) {
        console.error('❌ Error saving bookmark:', error);
        throw new Error(`Failed to save "${bookmark.title}": ${error.message}`);
    }
}

async function retrieveBookmarksFromFirestore(userId) {
    try {
        console.log('📖 Requesting bookmarks from background script securely...');
        
        // ✅ SECURE: Get Firebase ID token
        //const firebaseIdToken = await chrome.identity.getAuthToken({ interactive: false });
        const firebaseIdToken = await getValidFirebaseIdToken();
        
        const response = await chrome.runtime.sendMessage({
            action: 'getBookmarks',
            userId: userId,
            firebaseIdToken: firebaseIdToken // ✅ PASS FIREBASE ID TOKEN
        });
        
        if (response && response.success) {
            console.log(`✅ Securely retrieved ${response.bookmarks.length} bookmarks via background`);
            return response.bookmarks;
        } else {
            throw new Error(response?.error || 'Failed to get bookmarks from background');
        }
        
    } catch (error) {
        console.error('❌ Error getting bookmarks via background:', error);
        throw error;
    }
}

async function loadAndDisplayBookmarks() {
    try {
        console.log('📚 Loading and displaying bookmarks...');
        
        if (!auth.currentUser) {
            throw new Error('User not authenticated');
        }
        
        // Show loading state
        document.getElementById('bookmarkListSection').style.display = 'block';
        document.getElementById('quickReads').innerHTML = '<div class="loading-state"><div class="loading-spinner"></div>Loading bookmarks...</div>';
        document.getElementById('deepDives').innerHTML = '';
        document.getElementById('processing').innerHTML = '';
        
        // ✅ FIXED: Get Chrome Identity token
        //const firebaseIdToken = await chrome.identity.getAuthToken({ interactive: false });
        const firebaseIdToken = await getValidFirebaseIdToken();
        
        if (!firebaseIdToken) {
            throw new Error('No Chrome authentication token available');
        }
        
        // Get bookmarks from background script
        const response = await chrome.runtime.sendMessage({
            action: 'getBookmarks',
            userId: auth.currentUser.uid,
            firebaseIdToken: firebaseIdToken // ✅ PASS: firebaseIdToken
        });
        
        console.log('📊 Load bookmarks response:', response);
        
        if (response && response.success) {
            const bookmarks = response.bookmarks;
            console.log(`✅ Successfully retrieved ${bookmarks.length} bookmarks`);
            
            // Display bookmarks in categories (you'll need this function)
            displayBookmarksInCategories(bookmarks);
            
            // Add interactive buttons (if you have this function)
            setTimeout(() => {
                if (typeof emergencyButtonTest === 'function') {
                    emergencyButtonTest();
                }
            }, 500);
            
        } else {
            throw new Error(response?.error || 'Failed to get bookmarks');
        }
        
    } catch (error) {
        console.error('❌ Error loading bookmarks:', error);
        
        // Show error state
        document.getElementById('quickReads').innerHTML = `
            <div class="error-state">
                <p>Error loading bookmarks: ${error.message}</p>
                <button onclick="loadAndDisplayBookmarks()" style="margin-top: 10px;">Retry</button>
            </div>
        `;
    }
}

// Add this function around line 420-430, after loadAndDisplayBookmarks()
function displayBookmarksInCategories(bookmarks) {
    console.log('📊 Categorizing and displaying bookmarks...');
    
    const categorized = categorizeBookmarks(bookmarks);
    
    console.log(`📋 Categories: Quick(${categorized.quickReads.length}), Deep(${categorized.deepDives.length}), Processing(${categorized.processing.length})`);
    
    displayBookmarkCategory('quickReads', categorized.quickReads, 'Quick Reads');
    displayBookmarkCategory('deepDives', categorized.deepDives, 'Deep Dives');
    displayBookmarkCategory('processing', categorized.processing, 'Processing');
    
    console.log('✅ Bookmarks displayed successfully');
}

function categorizeBookmarks(bookmarks) {
    const quickReads = [];
    const deepDives = [];
    const processing = [];
    
    bookmarks.forEach(bookmark => {
        if (bookmark.status === 'pending' || bookmark.status === 'processing') {
            processing.push(bookmark);
        } else if (bookmark.readingTime && bookmark.readingTime <= 5) {
            quickReads.push(bookmark);
        } else if (bookmark.readingTime && bookmark.readingTime > 10) {
            deepDives.push(bookmark);
        } else {
            processing.push(bookmark);
        }
    });
    
    return { quickReads, deepDives, processing };
}

function displayBookmarkCategory(containerId, bookmarks, categoryName) {
    const container = document.getElementById(containerId);
    
    if (bookmarks.length === 0) {
        container.innerHTML = '<div class="empty-state">No bookmarks in this category</div>';
        return;
    }
    
    const categoryHeader = container.closest('.category').querySelector('h4');
    categoryHeader.textContent = `${categoryName} (${bookmarks.length})`;
    
    const bookmarksHTML = bookmarks.map(bookmark => createBookmarkHTML(bookmark)).join('');
    container.innerHTML = bookmarksHTML;
    
    // CRITICAL: Use setTimeout to ensure HTML is fully rendered before attaching listeners
    setTimeout(() => {
        attachBookmarkEventListeners(container, bookmarks);
    }, 100);
}

function createBookmarkHTML(bookmark) {
    const truncatedTitle = bookmark.title.length > 50 ? 
        bookmark.title.substring(0, 50) + '...' : 
        bookmark.title;
    
    const truncatedUrl = bookmark.url.length > 60 ? 
        bookmark.url.substring(0, 60) + '...' : 
        bookmark.url;
    
    const statusClass = `status-${bookmark.status}`;
    const readClass = bookmark.isRead ? 'read' : '';
    
    // CRITICAL FIX: Simplified HTML structure with inline styles for visibility
    return `
        <div class="bookmark-item" data-bookmark-id="${bookmark.id}" style="border: 1px solid #ddd; padding: 12px; margin-bottom: 8px; background: white;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
    <div style="font-weight: bold; flex: 1; margin-right: 10px;">${truncatedTitle}</div>
        </div>
            
            <div style="color: #666; font-size: 11px; margin-bottom: 8px;" title="${bookmark.url}">${truncatedUrl}</div>
            
            <div style="display: flex; gap: 10px; font-size: 11px; color: #888; flex-wrap: wrap;">
                ${bookmark.folder ? `<span style="background: #e3f2fd; padding: 2px 6px; border-radius: 3px;">${bookmark.folder}</span>` : ''}
                <span style="background: #fff3e0; color: #f57c00; padding: 2px 6px; border-radius: 3px;">${bookmark.status}</span>
                ${bookmark.readingTime ? `<span style="background: #f3e5f5; color: #7b1fa2; padding: 2px 6px; border-radius: 3px;">${bookmark.readingTime} min</span>` : ''}
            </div>
            
            ${bookmark.summary ? `
                <div style="margin-top: 10px; padding: 8px; background: #f8f9fa; border-radius: 3px; font-size: 12px;">
                    <strong>Summary:</strong>
                    <ul style="margin: 5px 0 0 0; padding-left: 20px;">
                        ${bookmark.summary.map(point => `<li style="margin-bottom: 3px;">${point}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}
        </div>
    `;
}

// CRITICAL FIX: Properly attach event listeners with detailed logging
function attachBookmarkEventListeners(container, bookmarks) {
    console.log('🔧 ATTACHING EVENT LISTENERS (IMPROVED)...');
    
    // Wait a moment for DOM to settle
    setTimeout(() => {
        const openButtons = container.querySelectorAll('.open-btn');
        const readButtons = container.querySelectorAll('.read-btn');
        
        console.log(`🔘 Found ${openButtons.length} open buttons and ${readButtons.length} read buttons`);
        
        // Test all buttons first
        const allButtons = container.querySelectorAll('.action-btn');
        allButtons.forEach((btn, i) => {
            btn.style.border = '3px solid red !important';
            console.log(`Button ${i} element:`, btn);
        });
        
        // Attach to open buttons
        openButtons.forEach((button, index) => {
            console.log(`🔗 Setting up open button ${index}`);
            
            // Remove old listeners and add new ones
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const url = this.getAttribute('data-url');
                console.log(`🔗 OPEN BUTTON CLICKED! URL: ${url}`);
                
                // Show immediate feedback
                this.style.background = '#4caf50 !important';
                this.textContent = 'OPENING...';
                
                try {
                    chrome.tabs.create({ url: url }, (tab) => {
                        if (chrome.runtime.lastError) {
                            console.error('❌ Chrome tabs failed:', chrome.runtime.lastError);
                            window.open(url, '_blank');
                        } else {
                            console.log('✅ Opened in new tab');
                        }
                        
                        // Reset button
                        setTimeout(() => {
                            this.style.background = '#e3f2fd !important';
                            this.textContent = 'OPEN';
                        }, 1000);
                    });
                } catch (error) {
                    console.error('❌ Error opening URL:', error);
                    window.open(url, '_blank');
                }
            });
            
            // Add hover effect
            newButton.addEventListener('mouseenter', function() {
                this.style.background = '#bbdefb !important';
            });
            
            newButton.addEventListener('mouseleave', function() {
                this.style.background = '#e3f2fd !important';
            });
        });
        
        // Attach to read buttons
        readButtons.forEach((button, index) => {
            console.log(`📖 Setting up read button ${index}`);
            
            // Remove old listeners and add new ones
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            newButton.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const bookmarkId = this.getAttribute('data-bookmark-id');
                console.log(`📖 READ BUTTON CLICKED! Bookmark ID: ${bookmarkId}`);
                
                // Show immediate feedback
                this.style.background = '#4caf50 !important';
                this.textContent = 'UPDATING...';
                
/*                try {
                    await toggleBookmarkReadStatus(bookmarkId, this);
                } catch (error) {
                    console.error('❌ Failed to toggle read status:', error);
                    alert('Failed to update bookmark status: ' + error.message);
                    
                    // Reset button on error
                    this.style.background = '#fff3e0 !important';
                    this.textContent = 'MARK';
                }*/
            });
            
            // Add hover effect
            newButton.addEventListener('mouseenter', function() {
                const isRead = this.classList.contains('read');
                this.style.background = isRead ? '#c8e6c9 !important' : '#ffe0b2 !important';
            });
            
            newButton.addEventListener('mouseleave', function() {
                const isRead = this.classList.contains('read');
                this.style.background = isRead ? '#e8f5e8 !important' : '#fff3e0 !important';
            });
        });
        
        console.log(`✅ Event listeners attached with improved styling`);
        
    }, 200); // Wait 200ms for DOM to be ready
}

// UI functions for import progress
function showImportProgress() {
    document.getElementById('importSection').style.display = 'block';
    document.getElementById('importBtn').disabled = true;
    document.getElementById('importProgressText').textContent = 'Preparing import...';
    document.getElementById('importProgress').style.width = '0%';
}

function hideImportProgress() {
    document.getElementById('importSection').style.display = 'none';
    document.getElementById('importBtn').disabled = false;
}

function updateImportProgress(processed, total, percentage) {
    const progressBar = document.getElementById('importProgress');
    const progressText = document.getElementById('importProgressText');
    
    if (progressBar) {
        progressBar.style.width = `${percentage}%`;
    }
    
    if (progressText) {
        progressText.textContent = `Importing bookmarks... ${processed}/${total} (${percentage}%)`;
    }
}

function showImportComplete(results) {
    hideImportProgress();
    
    // Show inline success message instead of modal
    const successMessage = document.getElementById('successMessage');
    if (successMessage) {
        successMessage.textContent = `✅ Import completed! ${results.success}/${results.total} bookmarks imported successfully.`;
        successMessage.style.display = 'block';
        
        // Hide after 5 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 5000);
    }
    
    loadBookmarkData();
}

console.log('=== POPUP.JS V13 LOADED WITH FIXED INTERACTIVE BUTTONS AND DEBUG ===');
// EMERGENCY FIX: Add this function to the END of your popup.js file

// Replace the emergencyButtonTest function in your popup.js with this improved version:

// Replace the emergencyButtonTest function with this compact version:

// Replace the emergencyButtonTest function with this safer version:

// Replace your entire emergencyButtonTest function with this corrected version:

function emergencyButtonTest() {
    console.log('🚨 SAFE COMPACT BUTTON TEST STARTING...');
    
    // ONLY target bookmark items in the processing section
    const processingSection = document.getElementById('processing');
    if (!processingSection) {
        console.log('❌ Processing section not found');
        return;
    }
    
    const bookmarkItems = processingSection.querySelectorAll('.bookmark-item');
    console.log(`Found ${bookmarkItems.length} bookmark items in processing section`);
    
    // Add compact buttons to each bookmark item
    bookmarkItems.forEach((item, index) => {
        // Skip if buttons already added
        if (item.querySelector('.emergency-buttons')) {
            console.log(`Skipping bookmark ${index} - buttons already exist`);
            return;
        }
        
        // Get bookmark data FIRST
        const bookmarkId = item.getAttribute('data-bookmark-id');
        
        // Find URL - look in all divs for text containing http
        let url = '';
        const allDivs = item.querySelectorAll('div');
        for (const div of allDivs) {
            const text = div.textContent || '';
            const titleAttr = div.title || '';
            if (text.includes('http') || titleAttr.includes('http')) {
                url = titleAttr || text;
                break;
            }
        }
        
        console.log(`Compact bookmark ${index}: ID=${bookmarkId}, URL found=${!!url}`);
        
        // Find the first div that contains the title (should be first child)
        const titleContainer = item.querySelector('div:first-child');
        
        if (titleContainer) {
            // Create compact button container
            const buttonContainer = document.createElement('span');
            buttonContainer.className = 'emergency-buttons';
            buttonContainer.style.cssText = `
                display: inline-flex !important;
                gap: 3px !important;
                margin-left: 8px !important;
                vertical-align: middle !important;
            `;
            
            // Create compact OPEN button
            const openBtn = document.createElement('button');
            openBtn.textContent = '🔗';
            openBtn.title = 'Open bookmark';
            openBtn.style.cssText = `
                background: #2196F3 !important;
                color: white !important;
                border: 1px solid #1976D2 !important;
                border-radius: 3px !important;
                padding: 2px 4px !important;
                cursor: pointer !important;
                font-size: 10px !important;
                width: 20px !important;
                height: 20px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                margin: 0 !important;
                line-height: 1 !important;
            `;
            
            // Create compact MARK button
            const markBtn = document.createElement('button');
            markBtn.textContent = '📖';
            markBtn.title = 'Mark as read';
            markBtn.style.cssText = `
                background: #FF9800 !important;
                color: white !important;
                border: 1px solid #F57C00 !important;
                border-radius: 3px !important;
                padding: 2px 4px !important;
                cursor: pointer !important;
                font-size: 10px !important;
                width: 20px !important;
                height: 20px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                margin: 0 !important;
                line-height: 1 !important;
            `;
            
            // Create compact DELETE button
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '🗑️';
            deleteBtn.title = 'Delete bookmark';
            deleteBtn.style.cssText = `
                background: #ffffff !important;
                color: #f44336 !important;
                border: 1px solid #f44336 !important;
                border-radius: 3px !important;
                padding: 2px 4px !important;
                cursor: pointer !important;
                font-size: 10px !important;
                width: 20px !important;
                height: 20px !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                margin: 0 !important;
                line-height: 1 !important;
            `;

            // OPEN button click handler
            openBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log(`🔗 COMPACT OPEN clicked for bookmark ${index}`);
                
                const originalText = this.textContent;
                this.textContent = '⏳';
                this.style.background = '#4CAF50 !important';
                
                try {
                    if (url && (url.includes('http') || url.includes('www.'))) {
                        const finalUrl = url.startsWith('http') ? url : `https://${url}`;
                        
                        chrome.tabs.create({ url: finalUrl }, (tab) => {
                            if (chrome.runtime.lastError) {
                                console.error('❌ Chrome tabs failed:', chrome.runtime.lastError);
                                window.open(finalUrl, '_blank');
                            } else {
                                console.log('✅ Tab opened successfully');
                            }
                            
                            // Reset button
                            setTimeout(() => {
                                this.textContent = originalText;
                                this.style.background = '#2196F3 !important';
                            }, 600);
                        });
                    } else {
                        console.log('❌ No valid URL found for bookmark');
                        this.textContent = '❌';
                        this.style.background = '#f44336 !important';
                        setTimeout(() => {
                            this.textContent = originalText;
                            this.style.background = '#2196F3 !important';
                        }, 1000);
                    }
                } catch (error) {
                    console.error('❌ Error opening tab:', error);
                    this.textContent = '❌';
                    this.style.background = '#f44336 !important';
                    setTimeout(() => {
                        this.textContent = originalText;
                        this.style.background = '#2196F3 !important';
                    }, 1000);
                }
            });
            
            // MARK button click handler (ENHANCED WITH TOGGLE)
            markBtn.addEventListener('click', async function(e) {
    e.preventDefault();
    e.stopPropagation();
    
    // Determine current state
    const isCurrentlyRead = this.textContent === '✅';
    const newReadStatus = !isCurrentlyRead;
    
    console.log(`📖 SECURE MARK clicked for bookmark ${index}, setting to: ${newReadStatus ? 'read' : 'unread'}`);
    
    const originalText = this.textContent;
    this.textContent = '⏳';
    this.style.background = '#4CAF50 !important';
    
    try {
        if (auth && auth.currentUser && bookmarkId) {
            console.log(`🔄 Securely updating Firestore bookmark ${bookmarkId} to isRead: ${newReadStatus}`);
            
            // ✅ SECURE: Get Firebase ID token for authentication
            const firebaseIdToken = await getValidFirebaseIdToken();
            
            if (!firebaseIdToken) {
                throw new Error('Unable to get authentication token');
            }
            
            const firestoreUrl = `https://firestore.googleapis.com/v1/projects/summarist-project-dbc0d/databases/(default)/documents/users/${auth.currentUser.uid}/bookmarks/${bookmarkId}?updateMask.fieldPaths=isRead`;
            
            const updateData = {
                fields: {
                    isRead: { booleanValue: newReadStatus }
                }
            };
            
            // ✅ SECURE: Make authenticated request
            const response = await fetch(firestoreUrl, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${firebaseIdToken}` // ✅ ADDED AUTHENTICATION
                },
                body: JSON.stringify(updateData)
            });
            
            if (response.ok) {
                console.log(`✅ Successfully updated Firestore securely: isRead = ${newReadStatus}`);
                
                // Update button appearance based on new state
                if (newReadStatus) {
                    this.textContent = '✅';
                    this.style.background = '#4CAF50 !important';
                    this.title = 'Mark as unread (click to toggle)';
                } else {
                    this.textContent = '📖';
                    this.style.background = '#FF9800 !important';
                    this.title = 'Mark as read';
                }
                
                // Update the status text in the bookmark item
                updateBookmarkStatusDisplay(item, newReadStatus);
                
            } else {
                const errorText = await response.text();
                console.error(`❌ Secure Firestore update failed: ${response.status} - ${errorText}`);
                throw new Error(`Secure update failed: ${response.status}`);
            }
        } else {
            console.log('⚠️ No auth or bookmarkId available for secure update');
            throw new Error('Authentication required');
        }
        
    } catch (error) {
        console.error('❌ Error in secure bookmark read status update:', error);
        this.textContent = '❌';
        this.style.background = '#f44336 !important';
        this.title = `Error: ${error.message}`;
        
        // Reset button after error
        setTimeout(() => {
            this.textContent = originalText;
            this.style.background = originalText === '✅' ? '#4CAF50 !important' : '#FF9800 !important';
            this.title = originalText === '✅' ? 'Mark as unread' : 'Mark as read';
        }, 2000);
    }
});
            
            // DELETE button click handler
            deleteBtn.addEventListener('click', async function(e) {
                e.preventDefault();
                e.stopPropagation();
    
                const bookmarkTitle = item.querySelector('div[style*="font-weight: bold"]').textContent;
    
                if (confirm(`Delete "${bookmarkTitle.substring(0, 40)}..."?`)) {
                    await deleteBookmarkWithUndo(bookmarkId, bookmarkTitle, this);
                }
            });
            
            // Add hover effects for MARK button
            markBtn.addEventListener('mouseenter', function() {
                if (this.textContent === '📖') {
                    this.style.background = '#F57C00 !important';
                } else if (this.textContent === '✅') {
                    this.style.background = '#388E3C !important';
                }
            });
            
            markBtn.addEventListener('mouseleave', function() {
                if (this.textContent === '📖') {
                    this.style.background = '#FF9800 !important';
                } else if (this.textContent === '✅') {
                    this.style.background = '#4CAF50 !important';
                }
            });
            
            // Add buttons to container (CORRECTED ORDER)
            buttonContainer.appendChild(openBtn);
            buttonContainer.appendChild(markBtn);
            buttonContainer.appendChild(deleteBtn);
            
            // Safely add to the title container without disrupting layout
            const titleDiv = titleContainer.querySelector('div[style*="font-weight: bold"]') || titleContainer.firstElementChild;
            if (titleDiv) {
                titleDiv.appendChild(buttonContainer);
            } else {
                titleContainer.appendChild(buttonContainer);
            }
        }
    });
    
    // Helper function to update status display (INSIDE the main function)
    function updateBookmarkStatusDisplay(bookmarkItem, isRead) {
        try {
            // Find the status element (should show "pending" currently)
            const statusElements = bookmarkItem.querySelectorAll('span');
            let statusElement = null;
            
            for (const span of statusElements) {
                if (span.textContent === 'pending' || span.textContent === 'read' || span.style.background === 'rgb(255, 243, 224)') {
                    statusElement = span;
                    break;
                }
            }
            
            if (statusElement) {
                if (isRead) {
                    statusElement.textContent = 'read';
                    statusElement.style.background = '#e8f5e8 !important';
                    statusElement.style.color = '#388e3c !important';
                    console.log('📊 Updated status display to "read"');
                } else {
                    statusElement.textContent = 'pending';
                    statusElement.style.background = '#fff3e0 !important';
                    statusElement.style.color = '#f57c00 !important';
                    console.log('📊 Updated status display to "pending"');
                }
            } else {
                console.log('⚠️ Status element not found in bookmark item');
            }
        } catch (error) {
            console.error('❌ Error updating status display:', error);
        }
    }
    
    console.log(`✅ Compact buttons safely added to ${bookmarkItems.length} bookmarks`);
    console.log(`🎯 Look for small 🔗 and 📖 buttons next to bookmark titles`);
    
    // Check that main UI buttons still exist
    const viewBtn = document.getElementById('viewBtn');
    console.log(`🔍 UI Check - View button: ${viewBtn ? 'EXISTS' : 'MISSING'}`);
}
// Gmail-style delete with undo
// Gmail-style delete with undo - SECURE VERSION
async function deleteBookmarkWithUndo(bookmarkId, bookmarkTitle, buttonElement) {
    try {
        // ✅ SECURE: Get Chrome token
        //const firebaseIdToken = await chrome.identity.getAuthToken({ interactive: false });
        const firebaseIdToken = await getValidFirebaseIdToken();
        
        if (!firebaseIdToken) {
            throw new Error('Unable to get authentication token');
        }
        
        const response = await chrome.runtime.sendMessage({
            action: 'deleteBookmark',
            bookmarkId: bookmarkId,
            userId: auth.currentUser.uid,
            firebaseIdToken: firebaseIdToken // ✅ PASS firebaseIdToken
        });
        
        if (response && response.success) {
            const bookmarkItem = buttonElement.closest('.bookmark-item');
            bookmarkItem.style.display = 'none';
            showUndoToast(bookmarkId, bookmarkTitle, bookmarkItem);
        } else {
            throw new Error(response?.error || 'Delete failed');
        }
    } catch (error) {
        console.error('❌ Delete failed:', error);
        alert('Delete failed: ' + error.message);
    }
}

// Show undo notification
// Replace the showUndoToast function in your popup.js with this improved version:

function showUndoToast(bookmarkId, title, bookmarkElement) {
    // Create compact Gmail-style toast
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #323232;
        color: white;
        padding: 8px 16px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 12px;
        z-index: 10001;
        font-size: 13px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        max-width: 280px;
        min-width: 200px;
        animation: slideUp 0.3s ease-out;
    `;
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUp {
            from {
                transform: translateX(-50%) translateY(100%);
                opacity: 0;
            }
            to {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
        }
        
        @keyframes slideDown {
            from {
                transform: translateX(-50%) translateY(0);
                opacity: 1;
            }
            to {
                transform: translateX(-50%) translateY(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Truncate title for compact display
    const displayTitle = title.length > 25 ? title.substring(0, 25) + '...' : title;
    
    toast.innerHTML = `
        <span style="flex: 1; color: #ffffff;">Deleted "${displayTitle}"</span>
        <button id="undoDelete" style="
            background: transparent;
            color: #4CAF50;
            border: none;
            padding: 4px 8px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            transition: background-color 0.2s ease;
        " onmouseover="this.style.backgroundColor='rgba(76, 175, 80, 0.1)'" 
           onmouseout="this.style.backgroundColor='transparent'">
            UNDO
        </button>
    `;
    
    document.body.appendChild(toast);
    
    // Auto-remove after 8 seconds with smooth animation
    const timeout = setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.style.animation = 'slideDown 0.3s ease-out forwards';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }
    }, 8000);
    
    // Undo functionality
    toast.querySelector('#undoDelete').addEventListener('click', async () => {
        clearTimeout(timeout);
        
        // Show loading state
        const undoBtn = toast.querySelector('#undoDelete');
        undoBtn.textContent = 'UNDOING...';
        undoBtn.style.color = '#999';
        undoBtn.disabled = true;
        
        try {
            await restoreBookmark(bookmarkId);
            bookmarkElement.style.display = 'block';
            
            // Success feedback
            toast.innerHTML = `
                <span style="flex: 1; color: #4CAF50;">
                    <span style="margin-right: 6px;">✓</span>Bookmark restored
                </span>
            `;
            
            // Remove after success message
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    toast.style.animation = 'slideDown 0.3s ease-out forwards';
                    setTimeout(() => {
                        if (document.body.contains(toast)) {
                            document.body.removeChild(toast);
                        }
                    }, 300);
                }
            }, 2000);
            
        } catch (error) {
            console.error('❌ Failed to restore bookmark:', error);
            
            // Error feedback
            toast.innerHTML = `
                <span style="flex: 1; color: #f44336;">
                    <span style="margin-right: 6px;">✗</span>Restore failed
                </span>
            `;
            
            // Remove after error message
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 3000);
        }
    });
}

// Restore deleted bookmark
// Fixed restore bookmark function
// Fixed restore bookmark function - USE BACKGROUND SCRIPT
async function restoreBookmark(bookmarkId) {
    try {
        console.log('🔄 Securely restoring bookmark via background script:', bookmarkId);
        
        // ✅ SECURE: Get Chrome token for authentication
        const firebaseIdToken = await getValidFirebaseIdToken();
        
        if (!firebaseIdToken) {
            throw new Error('Unable to get authentication token');
        }
        
        // ✅ USE BACKGROUND SCRIPT (consistent with other functions)
        const response = await chrome.runtime.sendMessage({
            action: 'restoreBookmark',
            bookmarkId: bookmarkId,
            userId: auth.currentUser.uid,
            firebaseIdToken: firebaseIdToken // ✅ PASS CHROME TOKEN
        });
        
        if (response && response.success) {
            console.log('✅ Bookmark securely restored via background script');
        } else {
            throw new Error(response?.error || 'Restore failed');
        }
        
    } catch (error) {
        console.error('❌ Error in secure restore via background:', error);
        throw error;
    }
}
// New function to show folder selection dialog
async function showFolderSelectionDialog(bookmarkTree) {
    return new Promise((resolve) => {
        // Create modal overlay
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        `;
        
        // Create dialog content
        const dialog = document.createElement('div');
           dialog.style.cssText = `
            background: white;
            border-radius: 8px;
            padding: 20px;
            max-width: 400px;
            max-height: 500px;
            overflow-y: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        `;
/*        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7) !important;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        `;*/
        
        // Build folder tree analysis
        const folderAnalysis = analyzeFolderStructure(bookmarkTree);
        
        dialog.innerHTML = `
            <h3 style="margin: 0 0 15px 0; color: #333;">Select Folders to Import</h3>
            <p style="color: #666; font-size: 14px; margin-bottom: 15px;">
                Choose which bookmark folders you'd like to import. Uncheck folders you don't want.
            </p>
            
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; margin-bottom: 10px; font-weight: bold;">
                    <input type="checkbox" id="selectAll" checked style="margin-right: 8px;">
                    Select All (${folderAnalysis.totalBookmarks} bookmarks)
                </label>
            </div>
            
            <div id="folderList" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 4px; padding: 10px;">
                ${folderAnalysis.folders.map((folder, index) => `
                    <label style="display: flex; align-items: center; margin-bottom: 8px; padding: 4px;">
                        <input type="checkbox" class="folder-checkbox" value="${folder.path}" checked style="margin-right: 8px;">
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: #333;">${folder.name}</div>
                            <div style="font-size: 12px; color: #666;">${folder.count} bookmarks</div>
                        </div>
                    </label>
                `).join('')}
            </div>
            
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancelImport" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">
                    Cancel
                </button>
                <button id="confirmImport" style="padding: 8px 16px; border: none; background: #1976d2; color: white; border-radius: 4px; cursor: pointer;">
                    Import Selected
                </button>
            </div>
        `;
        
        modal.appendChild(dialog);
        document.body.appendChild(modal);
        
        // Add event listeners
        const selectAllCheckbox = dialog.querySelector('#selectAll');
        const folderCheckboxes = dialog.querySelectorAll('.folder-checkbox');
        const cancelBtn = dialog.querySelector('#cancelImport');
        const confirmBtn = dialog.querySelector('#confirmImport');
        
        // Select all functionality
        selectAllCheckbox.addEventListener('change', function() {
            folderCheckboxes.forEach(checkbox => {
                checkbox.checked = this.checked;
            });
        });
        
        // Update select all when individual checkboxes change
        folderCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', function() {
                const allChecked = Array.from(folderCheckboxes).every(cb => cb.checked);
                const noneChecked = Array.from(folderCheckboxes).every(cb => !cb.checked);
                selectAllCheckbox.checked = allChecked;
                selectAllCheckbox.indeterminate = !allChecked && !noneChecked;
            });
        });
        
        // Cancel button
        cancelBtn.addEventListener('click', function() {
            document.body.removeChild(modal);
            resolve(null);
        });
        
        // Confirm button
        confirmBtn.addEventListener('click', function() {
            const selectedFolders = Array.from(folderCheckboxes)
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value);
            
            document.body.removeChild(modal);
            resolve(selectedFolders);
        });
        
        // Close on overlay click
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                document.body.removeChild(modal);
                resolve(null);
            }
        });
    });
}

// Helper function to analyze folder structure
function analyzeFolderStructure(nodes, path = '') {
    let folders = [];
    let totalBookmarks = 0;
    
    function traverse(nodes, currentPath) {
        for (const node of nodes) {
            if (node.children) {
                // This is a folder
                const folderPath = currentPath ? `${currentPath}/${node.title}` : node.title;
                const bookmarkCount = countBookmarksInFolder(node);
                
                if (bookmarkCount > 0) {
                    folders.push({
                        name: folderPath,
                        path: folderPath,
                        count: bookmarkCount
                    });
                    totalBookmarks += bookmarkCount;
                }
                
                // Recurse into subfolders
                traverse(node.children, folderPath);
            }
        }
    }
    
    traverse(nodes, path);
    
    return { folders, totalBookmarks };
}

// Helper function to count bookmarks in a folder
function countBookmarksInFolder(folderNode) {
    let count = 0;
    
    function countRecursive(nodes) {
        for (const node of nodes) {
            if (node.url) {
                count++;
            } else if (node.children) {
                countRecursive(node.children);
            }
        }
    }
    
    if (folderNode.children) {
        countRecursive(folderNode.children);
    }
    
    return count;
}
// Test authenticated access to Firestore
async function testAuthenticatedAccess() {
    if (!auth.currentUser) {
        console.log('❌ No authenticated user');
        return;
    }
    
    try {
        console.log('🔍 Testing authenticated access...');
        
        // Get ID token for authentication
        const firebaseIdToken = await getValidFirebaseIdToken();
        
        const testUrl = `https://firestore.googleapis.com/v1/projects/summarist-project-dbc0d/databases/(default)/documents/users/${auth.currentUser.uid}/bookmarks`;
        
        const response = await fetch(testUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${firebaseIdToken}`
            }
        });
        
        console.log('📊 Authenticated request status:', response.status);
        
        if (response.ok) {
            console.log('✅ Authenticated access working');
        } else {
            console.error('❌ Authenticated access failed:', await response.text());
        }
        
    } catch (error) {
        console.error('❌ Authentication test failed:', error);
    }
}

// Add this to test security after login
async function testSecurity() {
    console.log('🧪 Testing security...');
    
    // Test 1: Try unauthenticated access (should fail)
    try {
        const response = await fetch(`https://firestore.googleapis.com/v1/projects/summarist-project-dbc0d/databases/(default)/documents/users/${auth.currentUser.uid}/bookmarks`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            console.error('🚨 SECURITY BREACH: Unauthenticated access worked!');
        } else {
            console.log('✅ Security working: Unauthenticated access blocked');
        }
    } catch (error) {
        console.log('✅ Security working: Request blocked');
    }
    
    // Test 2: Try authenticated access (should work)
    const firebaseIdToken = await getValidFirebaseIdToken();
    const authResponse = await fetch(`https://firestore.googleapis.com/v1/projects/summarist-project-dbc0d/databases/(default)/documents/users/${auth.currentUser.uid}/bookmarks`, {
        method: 'GET',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${firebaseIdToken}`
        }
    });
    
    if (authResponse.ok) {
        console.log('✅ Authenticated access working');
    } else {
        console.error('❌ Authenticated access failed');
    }
}