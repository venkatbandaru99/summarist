// firebase-bundle.js - Fixed Chrome Extension Auth
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
    chrome.storage.local.remove(['currentUser', 'authToken'], () => {
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

// Storage functions for persistence
async function saveUserState(user, token) {
    console.log('💾 Saving user state to storage...');
    return new Promise((resolve) => {
        chrome.storage.local.set({
            currentUser: user,
            authToken: token,
            loginTime: Date.now()
        }, () => {
            console.log('✅ User state saved to storage');
            resolve();
        });
    });
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

export async function signInWithPopup(auth, provider) {
    console.log('🔐 Starting Chrome Identity getAuthToken...');
    
    try {
        // Clear any cached tokens first
        console.log('🧹 Clearing cached tokens...');
        await chrome.identity.clearAllCachedAuthTokens();
        
        console.log('🚀 Getting fresh auth token with full scopes...');
        
        // Get a fresh token with FULL Google API scopes
        const token = await chrome.identity.getAuthToken({
            interactive: true,
            scopes: [
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/user.emails.read',
                'openid'
            ]
        });
        
        console.log('✅ Got auth token:', !!token);
        console.log('🔍 Token type:', typeof token);
        console.log('🔍 Token value:', token);
        
        // Safe token preview
        if (token && typeof token === 'string') {
            console.log('🔍 Token starts with:', token.substring(0, 10));
        } else {
            console.log('🔍 Token is not a string, full value:', token);
        }
        
        if (!token) {
            throw new Error('No auth token received from Chrome');
        }
        
        // Safely convert token to string regardless of its type
        let tokenString;
        if (typeof token === 'string') {
            tokenString = token;
        } else if (typeof token === 'object' && token !== null) {
            // Sometimes Chrome returns an object with token property
            tokenString = token.token || token.access_token || JSON.stringify(token);
        } else {
            tokenString = String(token);
        }
        
        console.log('🔍 Final token string length:', tokenString.length);
        console.log('🔍 Final token type:', typeof tokenString);
        console.log('🔍 Final token starts with:', tokenString.substring(0, 20) + '...');
        
        // Try the simplest API first - just basic userinfo
        console.log('📡 Trying basic userinfo endpoint first...');
        const basicResponse = await fetch(`https://www.googleapis.com/oauth2/v2/userinfo`, {
            headers: {
                'Authorization': `Bearer ${tokenString}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📊 Basic userinfo response status:', basicResponse.status);
        
        if (!basicResponse.ok) {
            const errorText = await basicResponse.text();
            console.error('❌ Basic userinfo failed:', errorText);
            
            // If basic fails, let's debug the token
            console.log('🔍 Debugging token info...');
            try {
                const tokenInfoResponse = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${tokenString}`);
                console.log('📊 Token info status:', tokenInfoResponse.status);
                
                if (tokenInfoResponse.ok) {
                    const tokenInfo = await tokenInfoResponse.json();
                    console.log('🔍 Token info:', tokenInfo);
                    console.log('🔍 Token scopes:', tokenInfo.scope);
                } else {
                    const tokenError = await tokenInfoResponse.text();
                    console.error('❌ Token info error:', tokenError);
                }
            } catch (tokenInfoError) {
                console.error('❌ Token info request failed:', tokenInfoError);
            }
            
            throw new Error(`Authentication failed with status ${basicResponse.status}: ${errorText}`);
        }
        
        const userInfo = await basicResponse.json();
        console.log('👤 Basic user info received:', userInfo);
        
        // Create user object from basic userinfo
        const user = {
            uid: userInfo.id,
            email: userInfo.email,
            displayName: userInfo.name,
            photoURL: userInfo.picture,
            emailVerified: userInfo.verified_email || true
        };
        
        console.log('✅ Successfully parsed user data:', user);
        
        if (!user.email) {
            throw new Error('No email found in user info response');
        }
        
        // Update auth state
        auth.currentUser = user;
        auth._initialized = true;
        
        // Save to storage for persistence
        await saveUserState(user, tokenString);
        
        // Notify all callbacks
        auth._authStateCallbacks.forEach(callback => callback(user));
        
        return {
            user,
            credential: { accessToken: tokenString },
            operationType: 'signIn'
        };
        
    } catch (error) {
        console.error('❌ Authentication failed:', error);
        
        // Enhanced error messages
        if (error.message.includes('401')) {
            throw new Error('Google account access denied. Please ensure the extension has proper permissions and try again.');
        }
        
        if (error.message.includes('403')) {
            throw new Error('Google API access forbidden. The required APIs may not be enabled.');
        }
        
        if (error.message.includes('OAuth2 not granted')) {
            throw new Error('Please allow Google account access when prompted by Chrome.');
        }
        
        throw new Error(`Authentication failed: ${error.message}`);
    }
}