// firebase-bundle.js - Fixed for Chrome Extension Compatibility
const firebaseApps = new Map();

export function initializeApp(config, name = '[DEFAULT]') {
    const app = {
        name,
        options: config,
        config
    };
    firebaseApps.set(name, app);
    console.log('Firebase app initialized:', name);
    return app;
}

export function getApp(name = '[DEFAULT]') {
    return firebaseApps.get(name);
}

export function getAuth(app) {
    const auth = {
        app,
        currentUser: null,
        _authStateCallbacks: [],
        _setPersistence: () => Promise.resolve(),
        _signOut: () => Promise.resolve(),
        _initialized: false
    };
    
    // Auto-restore user state when auth is created
    restoreUserState(auth);
    
    return auth;
}

export function onAuthStateChanged(auth, callback) {
    auth._authStateCallbacks.push(callback);
    
    // If auth is already initialized, call callback immediately
    if (auth._initialized) {
        callback(auth.currentUser);
    } else {
        // Otherwise, restore state first, then call callback
        restoreUserState(auth).then(() => {
            callback(auth.currentUser);
        });
    }
    
    return () => {
        const index = auth._authStateCallbacks.indexOf(callback);
        if (index > -1) {
            auth._authStateCallbacks.splice(index, 1);
        }
    };
}

export function signOut(auth) {
    console.log('🚪 Signing out user...');
    auth.currentUser = null;
    auth._authStateCallbacks.forEach(callback => callback(null));
    
    // Clear stored user data
    chrome.storage.local.remove(['currentUser', 'authToken', 'firebaseIdToken', 'firebaseRefreshToken', 'tokenExchangeTime'], () => {
        console.log('✅ User data cleared from storage');
    });
    
    // Clear Chrome identity tokens
    chrome.identity.clearAllCachedAuthTokens(() => {
        console.log('✅ Chrome auth tokens cleared');
    });
    
    return Promise.resolve();
}

export function setPersistence(auth, persistence) {
    return Promise.resolve();
}

// ✅ FIXED: Chrome Extension Compatible Token Exchange
// ✅ QUICK FIX: Replace ONLY the getFirebaseIdTokenFromChrome function in firebase-bundle.js

export async function getValidFirebaseIdToken() {
    try {
        console.log('🔑 Getting Chrome Identity token with Firestore scopes...');
        
        // ✅ PRODUCTION: Only try non-interactive (silent)
        const chromeToken = await chrome.identity.getAuthToken({ 
            interactive: false,  // ✅ NEVER show popup during normal usage
            scopes: [
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/datastore',
                'https://www.googleapis.com/auth/cloud-platform',
                'openid'
            ]
        });
        
        if (!chromeToken) {
            throw new Error('User needs to login first - please click the login button');
        }
        
        // Convert to string if needed
        let tokenString;
        if (typeof chromeToken === 'object') {
            tokenString = chromeToken.token || chromeToken.access_token || String(chromeToken);
        } else {
            tokenString = String(chromeToken);
        }
        
        console.log('✅ Using Chrome token with Firestore scopes');
        return tokenString;
        
    } catch (error) {
        console.error('❌ Error getting Chrome token:', error);
        // ✅ PRODUCTION: Friendly error message directing to login
        throw new Error('Please login first to access your bookmarks');
    }
}

async function restoreUserState(auth) {
    console.log('🔄 Restoring user state from storage...');
    return new Promise((resolve) => {
        chrome.storage.local.get(['currentUser', 'authToken', 'loginTime'], (result) => {
            if (result.currentUser && result.authToken) {
                // Check if login is not too old (24 hours)
                const isRecentLogin = result.loginTime && (Date.now() - result.loginTime) < 24 * 60 * 60 * 1000;
                
                if (isRecentLogin) {
                    console.log('✅ Restored user from storage:', result.currentUser.email);
                    auth.currentUser = result.currentUser;
                    auth._initialized = true;
                    auth._authStateCallbacks.forEach(callback => callback(auth.currentUser));
                } else {
                    console.log('⏰ Stored login expired, clearing...');
                    chrome.storage.local.remove(['currentUser', 'authToken', 'loginTime']);
                    auth._initialized = true;
                }
            } else {
                console.log('📭 No stored user found');
                auth._initialized = true;
            }
            resolve();
        });
    });
}

export const browserLocalPersistence = 'local';

export class GoogleAuthProvider {
    constructor() {
        this.providerId = 'google.com';
        this.scopes = [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile',
            'openid'
        ];
    }
    
    addScope(scope) {
        this.scopes.push(scope);
    }
}

// ✅ DEBUG VERSION: Replace signInWithPopup function in firebase-bundle.js

// ✅ FIXED DEBUG: Replace signInWithPopup function in firebase-bundle.js

// ✅ SCOPE FIX: Replace signInWithPopup function in firebase-bundle.js
// Make sure to call the function that exists in your file

export async function signInWithPopup(auth, provider) {
    console.log('🔐 Starting Chrome Identity getAuthToken...');
    
    try {
        // Clear all cached tokens first
        await chrome.identity.clearAllCachedAuthTokens();
        console.log('✅ Cleared cached tokens');
        
        // ✅ SIMPLIFIED: Start with just basic scopes
        console.log('🔄 Requesting basic scopes only...');
        const token = await chrome.identity.getAuthToken({
            interactive: true,
            scopes: [
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile',
                'openid'
            ]
        });
        
        // ✅ SAFE LOGGING: Handle object tokens
        console.log('📊 Raw token received:', {
            type: typeof token,
            hasValue: !!token,
            isObject: typeof token === 'object',
            value: token  // This will show the full object structure
        });
        
        if (!token) {
            throw new Error('No auth token received from Chrome');
        }
        
        // ✅ HANDLE OBJECT TOKENS: Extract string value
        let tokenString;
        if (typeof token === 'object') {
            console.log('🔧 Token is object, extracting string value...');
            console.log('🔍 Object keys:', Object.keys(token));
            
            // Try common token object properties
            tokenString = token.token || 
                         token.access_token || 
                         token.accessToken || 
                         token.id_token || 
                         token.idToken ||
                         String(token);
            
            console.log('📝 Extracted token string:', {
                method: 'object extraction',
                type: typeof tokenString,
                length: tokenString ? tokenString.length : 0,
                preview: tokenString ? tokenString.substring(0, 20) + '...' : 'null'
            });
        } else {
            tokenString = String(token);
            console.log('📝 Token string:', {
                method: 'direct string',
                length: tokenString.length,
                preview: tokenString.substring(0, 20) + '...'
            });
        }
        
        // ✅ VALIDATE: Check if we got a valid token string
        if (!tokenString || tokenString === '[object Object]') {
            console.error('❌ Failed to extract valid token string from:', token);
            throw new Error('Unable to extract valid token string from Chrome response');
        }
        
        // ✅ TEST: Verify token format
        console.log('🔍 Token validation:', {
            startsWithYa29: tokenString.startsWith('ya29.'),
            startsWithOne: tokenString.startsWith('1//'),
            length: tokenString.length,
            firstChars: tokenString.substring(0, 10)
        });
        
        console.log('🔍 Testing token with userinfo API...');
        
        // Get user info with detailed debugging
        const basicResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo`, {
            headers: {
                'Authorization': `Bearer ${tokenString}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📊 Userinfo response:', {
            status: basicResponse.status,
            statusText: basicResponse.statusText,
            ok: basicResponse.ok
        });
        
        if (!basicResponse.ok) {
            const errorText = await basicResponse.text();
            console.error('❌ Userinfo API failed:', errorText);
            throw new Error(`Userinfo failed: ${basicResponse.status} - ${errorText}`);
        }
        
        const userInfo = await basicResponse.json();
        console.log('✅ Got user info:', {
            id: userInfo.id,
            email: userInfo.email,
            name: userInfo.name,
            verified: userInfo.verified_email
        });
        
        // Create user object
        const user = {
            uid: userInfo.id,
            email: userInfo.email,
            displayName: userInfo.name,
            photoURL: userInfo.picture,
            emailVerified: userInfo.verified_email || true
        };
        
        // Update auth state
        auth.currentUser = user;
        auth._initialized = true;
        
        // ✅ INLINE USER STATE SAVING: Avoid function scope issues
        console.log('💾 Saving user state to storage...');
        await new Promise((resolve) => {
            chrome.storage.local.set({
                currentUser: user,
                authToken: tokenString,
                loginTime: Date.now()
            }, () => {
                console.log('✅ User state saved to storage');
                resolve();
            });
        });
        
        // Notify callbacks
        auth._authStateCallbacks.forEach(callback => callback(user));
        
        console.log('✅ Login completed successfully');
        
        return {
            user,
            credential: { 
                accessToken: tokenString,
                idToken: tokenString
            },
            operationType: 'signIn'
        };
        
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        throw new Error(`Authentication failed: ${error.message}`);
    }
}